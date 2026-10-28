$flag = Join-Path $PSScriptRoot "AUTOPILOT"
if (Test-Path $flag) {
  '{"decision":"block","reason":"Continue. Nao pare. Pegue o proximo item pendente do ROADMAP.md, implemente, teste, atualize STATE.md e siga para o proximo."}'
}
