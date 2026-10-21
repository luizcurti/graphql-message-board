#!/usr/bin/env bash
# Full-stack checks against the running containers (docker compose up), or against the AWS
# deployment (BACKEND_URL and FRONTEND_URL = the CloudFront URL; see the CI deploy job).
GQL="${BACKEND_URL:-http://localhost:3333}/graphql"
FRONT="${FRONTEND_URL:-http://localhost:3000}"
RUN=$(date +%s)
PASS=0
FAIL=0

check() {
  if [ "$#" -ne 3 ]; then
    echo "  ❌  check called with $# args (expected 3): $1"
    FAIL=$((FAIL+1))
    return
  fi
  local name="$1" actual="$2" expected="$3"
  if echo "$actual" | grep -qF -- "$expected"; then
    echo "  ✅  $name"
    PASS=$((PASS+1))
  else
    echo "  ❌  $name"
    echo "      expected: $expected"
    echo "      received: $actual"
    FAIL=$((FAIL+1))
  fi
}

# gql '<query>' ['<variables json>'] → response body
gql() {
  local body vars="${2:-}"
  [ -z "$vars" ] && vars='{}'
  body=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1], "variables": json.loads(sys.argv[2])}))' "$1" "$vars")
  curl --max-time 5 -s -X POST "$GQL" -H "Content-Type: application/json" --data-raw "$body"
}

# get '<json>' '<python expr on d>' → value
get() {
  python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(eval(sys.argv[2]))' "$1" "$2" 2>/dev/null
}

section() {
  echo ""
  echo "════════════════════════════════════════"
  echo "  $1"
  echo "════════════════════════════════════════"
}

section "FRONT-END (SPA :3000)"

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/")
check "GET / → 200" "$R" "200"
HTML=$(curl --max-time 5 -s "$FRONT/")
check "GET / → HTML document" "$(echo "$HTML" | tr '[:upper:]' '[:lower:]')" "<!doctype html>"
check "GET / → React root element" "$HTML" '<div id="root">'

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/dashboard?id=1")
check "GET /dashboard?id=1 → 200 (SPA fallback)" "$R" "200"
R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/does-not-exist")
check "GET /does-not-exist → 200 (React renders 404)" "$R" "200"

BUNDLE=$(echo "$HTML" | grep -oE '/static/js/main\.[a-z0-9]+\.js' | head -1)
R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT$BUNDLE")
check "GET $BUNDLE → 200" "$R" "200"
API_HOST_PATH="${GQL#*://}" # localhost:3333/graphql locally, <cloudfront domain>/graphql on AWS
check "bundle points to the API URL" "$(curl --max-time 5 -s "$FRONT$BUNDLE" | grep -oF "$API_HOST_PATH" | head -1)" "$API_HOST_PATH"
check "GET missing asset → not a JS file (SPA fallback)" "$(curl --max-time 5 -s "$FRONT/static/js/missing.js" | head -c 15 | tr '[:upper:]' '[:lower:]')" "<!doctype html>"

section "BACK-END (API :3333)"

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ __typename }"}')
check "POST /graphql → 200" "$R" "200"
R=$(curl --max-time 5 -s -i -X OPTIONS "$GQL" -H "Origin: $FRONT" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type")
check "CORS preflight from the SPA origin → allowed" "$(echo "$R" | tr '[:upper:]' '[:lower:]')" "access-control-allow-origin: *"
R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ getStats { users"}')
check "syntax error → 400" "$R" "400"
R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ nope }"}')
check "unknown field → 400" "$R" "400"

section "STATS"

R=$(gql '{ getStats { users messages } }')
check "getStats → counts" "$R" '"getStats":{"users":'
USERS_BEFORE=$(get "$R" "d['data']['getStats']['users']")
MSGS_BEFORE=$(get "$R" "d['data']['getStats']['messages']")
check "getStats (sad) unknown field → error" "$(gql '{ getStats { nope } }')" "GRAPHQL_VALIDATION_FAILED"

section "USERS"

EMAIL="it-$RUN@example.com"
EMAIL2="it2-$RUN@example.com"
USER_Q='mutation ($email: String!) { createOrLoginUser(data: { email: $email }) { id email } }'

R=$(gql "$USER_Q" "{\"email\":\"$EMAIL\"}")
check "createOrLoginUser → new user" "$R" "\"email\":\"$EMAIL\""
USER_ID=$(get "$R" "d['data']['createOrLoginUser']['id']")
R=$(gql "$USER_Q" "{\"email\":\"$(echo "$EMAIL" | tr '[:lower:]' '[:upper:]')\"}")
check "createOrLoginUser → login (case-insensitive, same id)" "$R" "\"id\":$USER_ID,"
R=$(gql "$USER_Q" '{"email":"not-an-email"}')
check "createOrLoginUser (sad) invalid email → BAD_USER_INPUT" "$R" '"message":"Invalid email format"'
R=$(gql "$USER_Q" "{\"email\":\"$EMAIL2\"}")
USER2_ID=$(get "$R" "d['data']['createOrLoginUser']['id']")

R=$(gql '{ getUser(id: '"$USER_ID"') { id email } }')
check "getUser → user" "$R" "\"email\":\"$EMAIL\""
check "getUser (sad) not found → null" "$(gql '{ getUser(id: 999999) { id } }')" '"getUser":null'

R=$(gql '{ getUsers(page: 1, limit: 1) { total page pages items { id } } }')
check "getUsers → paginated" "$R" '"page":1'
check "getUsers (sad) limit 101 → BAD_USER_INPUT" "$(gql '{ getUsers(limit: 101) { total } }')" 'limit must not be greater than 100'

UPD='mutation ($id: Float!, $email: String!) { updateUser(data: { id: $id, email: $email }) { id email } }'
R=$(gql "$UPD" "{\"id\":$USER_ID,\"email\":\"upd-$EMAIL\"}")
check "updateUser → email changed" "$R" "\"email\":\"upd-$EMAIL\""
R=$(gql "$UPD" "{\"id\":$USER_ID,\"email\":\"$EMAIL2\"}")
check "updateUser (sad) email in use → BAD_USER_INPUT" "$R" "Email is already in use"
check "updateUser (sad) not found → NOT_FOUND" "$(gql "$UPD" '{"id":999999,"email":"x@example.com"}')" '"code":"NOT_FOUND"'

section "MESSAGES"

MSG_Q='mutation ($userId: Float!, $content: String!) { createMessage(data: { userId: $userId, content: $content }) { id content userId user { email } } }'

# Subscribe over WebSocket (graphql-ws protocol) before creating the message.
SUB_OUT=$(mktemp)
node -e '
  const ws = new WebSocket(process.argv[1].replace(/^http/, "ws"), "graphql-transport-ws");
  const done = (out) => { console.log(out); process.exit(0); };
  setTimeout(() => done("timeout"), 8000);
  ws.onopen = () => ws.send(JSON.stringify({ type: "connection_init" }));
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.type === "connection_ack") {
      ws.send(JSON.stringify({ id: "1", type: "subscribe",
        payload: { query: "subscription { messageAdded { content user { email } } }" } }));
      console.error("ready");
    }
    if (msg.type === "next") done(JSON.stringify(msg.payload));
  };
' "$GQL" > "$SUB_OUT" 2>"$SUB_OUT.ready" &
SUB_PID=$!
# Wait until the subscription is sent (over the internet the WebSocket handshake can take a
# while), then give the server a moment to register it.
for _ in $(seq 1 50); do grep -q ready "$SUB_OUT.ready" 2>/dev/null && break; sleep 0.1; done
sleep 0.5

R=$(gql "$MSG_Q" "{\"userId\":$USER_ID,\"content\":\"Hello $RUN\"}")
check "createMessage → created" "$R" "\"content\":\"Hello $RUN\""
check "  └─ user.email resolved via DataLoader" "$R" "\"email\":\"upd-$EMAIL\""
MSG_ID=$(get "$R" "d['data']['createMessage']['id']")

wait $SUB_PID
check "messageAdded subscription (WebSocket) → pushed" "$(cat "$SUB_OUT")" "\"content\":\"Hello $RUN\""
rm -f "$SUB_OUT" "$SUB_OUT.ready"

R=$(node -e '
  const ws = new WebSocket(process.argv[1].replace(/^http/, "ws"), "graphql-transport-ws");
  setTimeout(() => { console.log("timeout"); process.exit(0); }, 5000);
  ws.onopen = () => ws.send(JSON.stringify({ type: "connection_init" }));
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.type === "connection_ack")
      ws.send(JSON.stringify({ id: "1", type: "subscribe", payload: { query: "subscription { messageAdded { nope } }" } }));
    if (msg.type === "error") { console.log(JSON.stringify(msg.payload)); process.exit(0); }
  };
' "$GQL")
check "messageAdded (sad) invalid selection → error" "$R" 'Cannot query field \"nope\"'

R=$(gql "$MSG_Q" "{\"userId\":$USER_ID,\"content\":\"\"}")
check "createMessage (sad) empty content → BAD_USER_INPUT" "$R" "Message content cannot be empty"
check "createMessage (sad) nonexistent user → NOT_FOUND" "$(gql "$MSG_Q" '{"userId":999999,"content":"x"}')" '"message":"User not found"'

R=$(gql '{ getMessages(page: 1, limit: 10) { total page pages items { id content user { email } } } }')
check "getMessages → newest first" "$(get "$R" "d['data']['getMessages']['items'][0]['id']")" "$MSG_ID"
check "getMessages (sad) page 0 → BAD_USER_INPUT" "$(gql '{ getMessages(page: 0) { total } }')" 'page must not be less than 1'

R=$(gql '{ getMessagesFromUser(userId: '"$USER_ID"') { total items { userId } } }')
check "getMessagesFromUser → only that user" "$R" "{\"total\":1,\"items\":[{\"userId\":$USER_ID}]}"
check "getMessagesFromUser (sad) userId 0 → BAD_USER_INPUT" "$(gql '{ getMessagesFromUser(userId: 0) { total } }')" 'User ID must be a positive number'

check "getMessage → message" "$(gql '{ getMessage(id: '"$MSG_ID"') { content } }')" "\"content\":\"Hello $RUN\""
check "getMessage (sad) not found → null" "$(gql '{ getMessage(id: 999999) { id } }')" '"getMessage":null'

UPD_MSG='mutation ($id: Float!, $userId: Float!, $content: String!) { updateMessage(data: { id: $id, userId: $userId, content: $content }) { content } }'
R=$(gql "$UPD_MSG" "{\"id\":$MSG_ID,\"userId\":$USER_ID,\"content\":\"Edited\"}")
check "updateMessage → author edits" "$R" '"content":"Edited"'
R=$(gql "$UPD_MSG" "{\"id\":$MSG_ID,\"userId\":$USER2_ID,\"content\":\"x\"}")
check "updateMessage (sad) not the author → FORBIDDEN" "$R" '"code":"FORBIDDEN"'

DEL_MSG='mutation ($id: Float!, $userId: Float!) { deleteMessage(data: { id: $id, userId: $userId }) { id } }'
R=$(gql "$DEL_MSG" "{\"id\":$MSG_ID,\"userId\":$USER2_ID}")
check "deleteMessage (sad) not the author → FORBIDDEN" "$R" '"code":"FORBIDDEN"'
R=$(gql "$DEL_MSG" "{\"id\":$MSG_ID,\"userId\":$USER_ID}")
check "deleteMessage → author deletes" "$R" "\"id\":$MSG_ID"
check "  └─ message is gone" "$(gql '{ getMessage(id: '"$MSG_ID"') { id } }')" '"getMessage":null'

section "CLEANUP / CASCADE"

R=$(gql "$MSG_Q" "{\"userId\":$USER_ID,\"content\":\"cascade\"}")
CASCADE_ID=$(get "$R" "d['data']['createMessage']['id']")
DEL_USER='mutation ($id: Float!) { deleteUser(data: { id: $id }) { id } }'
check "deleteUser → deleted" "$(gql "$DEL_USER" "{\"id\":$USER_ID}")" "\"id\":$USER_ID"
check "  └─ cascades to the user's messages" "$(gql '{ getMessage(id: '"$CASCADE_ID"') { id } }')" '"getMessage":null'
check "deleteUser (sad) not found → NOT_FOUND" "$(gql "$DEL_USER" "{\"id\":$USER_ID}")" '"code":"NOT_FOUND"'
gql "$DEL_USER" "{\"id\":$USER2_ID}" > /dev/null

R=$(gql '{ getStats { users messages } }')
check "getStats → back to the initial counts" "$R" "{\"users\":$USERS_BEFORE,\"messages\":$MSGS_BEFORE}"

echo ""
echo "════════════════════════════════════════"
printf "  RESULT: %d passed / %d failed\n" $PASS $FAIL
echo "════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ]
