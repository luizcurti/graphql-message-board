#!/usr/bin/env bash
GQL="http://localhost:3333/graphql"
FRONT="http://localhost:3000"
PASS=0
FAIL=0

check() {
  local name="$1" actual="$2" expected="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  ✅  $name"
    PASS=$((PASS+1))
  else
    echo "  ❌  $name"
    echo "      expected: $expected"
    echo "      received: $actual"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "════════════════════════════════════════"
echo "  FRONT-END ROUTES (React SPA :3000)"
echo "════════════════════════════════════════"

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/")
check "GET /  → Home page"        "$R"  "200"

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/dashboard?id=1")
check "GET /dashboard?id=1  → Board page" "$R" "200"

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/nonexistent-page")
check "GET /nonexistent-page  → React 404 (SPA returns 200)" "$R" "200"

R=$(curl --max-time 5 -s "$FRONT/" | head -1 | tr '[:upper:]' '[:lower:]')
check "Front-end serves valid HTML (SPA)" "$R" "<!doctype html>"

echo ""
echo "════════════════════════════════════════"
echo "  BACK-END ROUTES"
echo "════════════════════════════════════════"

echo "GET /graphql  → GraphQL endpoint active (replaces REST GET /)"
R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ __typename }"}')
check "POST /graphql  → GraphQL endpoint active" "$R" "200"

R=$(curl --max-time 5 -s -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ getStats { users messages } }"}')
check "query getStats  → returns user and message counts" "$R" '"users"'

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ getStats { users"}')
check "malformed GraphQL query  → returns 400" "$R" "400"

echo ""
echo "════════════════════════════════════════"
echo "  GRAPHQL — FRONT-END OPERATIONS"
echo "════════════════════════════════════════"

# 1. createOrLoginUser — register
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"mutation { createOrLoginUser(data: { email: \"e2e@frontend.com\" }) { id email } }"}')
check "mutation createOrLoginUser (new user)" "$R" '"email":"e2e@frontend.com"'
USER_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['createOrLoginUser']['id'])" 2>/dev/null)

# 2. createOrLoginUser — login (same email)
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"mutation { createOrLoginUser(data: { email: \"e2e@frontend.com\" }) { id email } }"}')
check "mutation createOrLoginUser (login → returns same id)" "$R" "\"id\":$USER_ID"

# 3. createMessage
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw "{\"query\":\"mutation { createMessage(data: { content: \\\"Hello from e2e!\\\", userId: $USER_ID }) { id content userId user { email } } }\"}")
check "mutation createMessage (with resolved user field)"  "$R" '"content":"Hello from e2e!"'
check "  └─ user.email resolved via DataLoader"             "$R" '"email":"e2e@frontend.com"'
MSG_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['createMessage']['id'])" 2>/dev/null)

# 4. createMessage — sad path (nonexistent user still creates message; delete with wrong owner covers auth sad path)
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"mutation { createMessage(data: { content: \"\", userId: 1 }) { id } }"}')
check "mutation createMessage (empty content → validation error)" "$R" '"errors"'

# 5. getMessages (Board loads the feed)
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"query { getMessages(page: 1, limit: 10) { total page pages items { id content userId user { email } } } }"}')
check "query getMessages page 1 (Board feed)"        "$R" '"total"'
check "  └─ items contain user.email"                "$R" '"email"'

# 6. getMessages pagination page 2
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"query { getMessages(page: 2, limit: 5) { total page pages items { id } } }"}')
check "query getMessages page 2 (pagination)"        "$R" '"page":2'

# 7. deleteMessage — wrong owner
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw "{\"query\":\"mutation { deleteMessage(data: { id: $MSG_ID, userId: 99999 }) { id } }\"}")
check "mutation deleteMessage (wrong userId → error)" "$R" '"errors"'

# 8. deleteMessage — correct owner
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw "{\"query\":\"mutation { deleteMessage(data: { id: $MSG_ID, userId: $USER_ID }) { id } }\"}")
check "mutation deleteMessage (correct author → success)" "$R" "\"id\":$MSG_ID"

# 9. getMessages after delete — total drops
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"query { getMessages(page: 1, limit: 10) { total items { id } } }"}')
check "query getMessages after delete (Board refetch)" "$R" '"total"'
NOT_FOUND=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); ids=[i['id'] for i in d['data']['getMessages']['items']]; print('absent' if $MSG_ID not in ids else 'present')" 2>/dev/null)
check "  └─ deleted message does not appear in the list" "$NOT_FOUND" "absent"

echo ""
echo "════════════════════════════════════════"
printf "  RESULT: %d passed / %d failed\n" $PASS $FAIL
echo "════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ]
