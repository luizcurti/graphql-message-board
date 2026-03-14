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
    echo "      esperado: $expected"
    echo "      recebido: $actual"
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

R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$FRONT/pagina-inexistente")
check "GET /pagina-inexistente  → React 404 (SPA retorna 200)" "$R" "200"

R=$(curl --max-time 5 -s "$FRONT/" | head -1)
check "Front-end serve HTML válido (SPA)" "$R" "<!DOCTYPE html>"

echo ""
echo "════════════════════════════════════════"
echo "  BACK-END ROUTES"
echo "════════════════════════════════════════"

echo "GET /graphql  → endpoint GraphQL ativo (substitui REST GET /)"
R=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ __typename }"}')
check "POST /graphql  → endpoint GraphQL ativo" "$R" "200"

R=$(curl --max-time 5 -s -X POST "$GQL" -H "Content-Type: application/json" --data-raw '{"query":"{ getStats { users messages } }"}')
check "query getStats  → retorna contagem de users e messages" "$R" '"users"'

echo ""
echo "════════════════════════════════════════"
echo "  GRAPHQL — OPERAÇÕES DO FRONT-END"
echo "════════════════════════════════════════"

# 1. createOrLoginUser — register
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"mutation { createOrLoginUser(data: { email: \"e2e@frontend.com\" }) { id email } }"}')
check "mutation createOrLoginUser (novo usuário)" "$R" '"email":"e2e@frontend.com"'
USER_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['createOrLoginUser']['id'])" 2>/dev/null)

# 2. createOrLoginUser — login (mesmo email)
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"mutation { createOrLoginUser(data: { email: \"e2e@frontend.com\" }) { id email } }"}')
check "mutation createOrLoginUser (login → retorna mesmo id)" "$R" "\"id\":$USER_ID"

# 3. createMessage
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw "{\"query\":\"mutation { createMessage(data: { content: \\\"Ola do e2e!\\\", userId: $USER_ID }) { id content userId user { email } } }\"}")
check "mutation createMessage (com campo user resolvido)"  "$R" '"content":"Ola do e2e!"'
check "  └─ user.email resolvido via DataLoader"           "$R" '"email":"e2e@frontend.com"'
MSG_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['createMessage']['id'])" 2>/dev/null)

# 4. getMessages (Board carrega feed)
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"query { getMessages(page: 1, limit: 10) { total page pages items { id content userId user { email } } } }"}')
check "query getMessages page 1 (feed do Board)"     "$R" '"total"'
check "  └─ items contêm user.email"                 "$R" '"email"'

# 5. getMessages paginação page 2
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"query { getMessages(page: 2, limit: 5) { total page pages items { id } } }"}')
check "query getMessages page 2 (paginação)"         "$R" '"page":2'

# 6. deleteMessage — autor errado
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw "{\"query\":\"mutation { deleteMessage(data: { id: $MSG_ID, userId: 99999 }) { id } }\"}")
check "mutation deleteMessage (userId errado → erro)" "$R" '"errors"'

# 7. deleteMessage — autor correto
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw "{\"query\":\"mutation { deleteMessage(data: { id: $MSG_ID, userId: $USER_ID }) { id } }\"}")
check "mutation deleteMessage (autor correto → sucesso)" "$R" "\"id\":$MSG_ID"

# 8. getMessages após delete — total caiu
R=$(curl -s -X POST "$GQL" -H "Content-Type: application/json" \
  --data-raw '{"query":"query { getMessages(page: 1, limit: 10) { total items { id } } }"}')
check "query getMessages após delete (refetch do Board)" "$R" '"total"'
NOT_FOUND=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); ids=[i['id'] for i in d['data']['getMessages']['items']]; print('absent' if $MSG_ID not in ids else 'present')" 2>/dev/null)
check "  └─ mensagem deletada não aparece na lista" "$NOT_FOUND" "absent"

echo ""
echo "════════════════════════════════════════"
printf "  RESULTADO: %d passou / %d falhou\n" $PASS $FAIL
echo "════════════════════════════════════════"
echo ""
