# TASKS — журнал выполненного

Append-only. Новые записи добавляются снизу. Формат: `- дата — задача — коммит`.
Записи не редактируются и не удаляются.

- 2026-09-03 — wiki оформлена как Obsidian-vault (.obsidian: graph/core-plugins/app/appearance) — pending
- 2026-09-03 — создан корневой CLAUDE.md и этот журнал — pending
- 2026-09-03 — tier-5 gate приведён к PLAN.md (Skill.reqLevel + skillUnlocked), 8 уникальных effect kinds на ветку со сдвигом по тиру и джиттером силы (138 дублей описаний -> 0), уникальные имена gateway, integrity-проверки в gen-content.mjs — pending
- 2026-09-03 — вкладка Branches перерисована деревом: src/ui/tree.ts (раскладка, SVG-рёбра, зум), branches.ts на build/paint + панель деталей, Foundation как карта веток — pending
- 2026-09-03 — gstack отключён: снят PreToolUse/Skill-гейт check-gstack.sh из .claude/settings.json (глобальный SessionStart-хук gstack тоже убран) — pending
- 2026-09-03 — вкладки Setup и Upgrades слиты во вкладку Tree: одно дерево на 762 узла со слоями (Setup / Foundation / 8 веток / Upgrades), tree.ts стал общим рендерером, добавлены treemodel.ts и treetab.ts, удалены setup.ts и shop.ts, поиск с подсветкой по всем слоям — pending
- 2026-09-03 — Tree превращён в радиальную паутину: 794 узла, складные хабы, якоря рангов/специализаций/кранов, 5 семейств рёбер с дугами через центр (requires 80, career 202, affects 67, currency 40, fight 2), новый treegraph.ts, layoutRadial + drag-pan + LOD в tree.ts, Branch.rivals в данных, переключатель Web/Layers, состояние вида в zero10x.view.v1 — pending
- 2026-09-03 — зазоры между узлами вдвое меньше и переключатель плотности Tight/Roomy: константы раскладки собраны в Metrics, radius-защита от наезда переведена на полудиагональ бокса, layerLayout сбрасывает кэш при смене плотности — pending
- 2026-09-03 — gstack удалён полностью: 54 скилла из ~/.claude/skills, ~/.gstack, check-gstack.sh, ключи в ~/.claude.json; setupBase.md и .gitignore очищены от gstack — pending
- 2026-09-03 — [IN PROGRESS, не закоммичено] игра переведена с одной страницы на многостраничную: sidebar-навигация (src/ui/router.ts, nav.ts), 8 страниц в src/ui/pages/ (desk, tools, skills, career, awards, hop, stats, settings), прогрессивное открытие страниц (src/core/unlocks.ts), тосты (src/ui/toast.ts), quick dock, viewstore.ts вместо приватного хранилища treegraph, styles.css разбит на src/styles/{base,nav,pages,tree}.css, panels.ts удалён. typecheck зелёный, headless-smoke пройден для свежего сейва. Осталось: см. план в ~/.claude/plans/make-a-review-and-compressed-shamir.md §Status — pending
- 2026-09-04 — многостраничная игра доведена: headless-smoke на mid-game сейве (все страницы, hash после reload, quick dock, мобильный bottom bar 4+More без горизонтального скролла), документация синхронизирована — PLAN.md §3 «Pages» и правило Tools-страницы, §5 раскладка; README «How the game works» и «Where things live»; wiki overview «Pages», новая wiki/pages/concepts/progressive-reveal.md, index и log — pending
