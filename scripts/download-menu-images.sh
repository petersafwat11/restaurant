#!/usr/bin/env bash
# Downloads one JPG per menu-item slug into apps/api/uploads/menu-items/.
# Skips files that already exist. Fails fast if a download is < 5KB
# (Pollinations sometimes returns tiny error responses).
#
# Re-runnable; intended to be invoked once when seeding new dev environments,
# but the downloaded files should be committed to git so fresh clones don't
# need network access.

set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/apps/api/uploads/menu-items"
mkdir -p "$OUT_DIR"

declare -A PROMPTS=(
  [kebab-tortilla]="doner kebab tortilla wrap with chicken lettuce tomato sauce, restaurant food photography, top view, warm lighting"
  [kebab-pita]="doner kebab pita pocket with chicken lettuce tomato garlic sauce, food photography, top view"
  [kebab-w-bulce]="doner kebab in a fluffy bun with grilled meat and salad, food photography, top view"
  [kebab-kapsalon]="kapsalon dutch kebab dish with fries melted cheese chicken and salad in a tray, food photography, overhead"
  [kebab-na-talerzu]="doner kebab plate with grilled meat rice salad and sauces on white plate, food photography"
  [kebab-box]="kebab box with chicken meat french fries salad and garlic sauce in a takeaway container, food photography, top view"
  [fryto-kebab]="kebab wrap with french fries inside tortilla, food photography, top view"
  [salatka-kebab]="fresh kebab salad bowl with grilled chicken tomato cucumber lettuce and dressing, food photography, top view"
  [tortilla-falafel]="falafel tortilla wrap with hummus lettuce tomato and tahini sauce, vegetarian food photography, top view"
  [bulka-falafel]="falafel sandwich in a fluffy bun with salad and tahini sauce, vegetarian food photography"
  [pita-falafel]="falafel pita pocket with hummus tahini and fresh salad, vegetarian food photography"
  [talerz-falafel]="falafel plate with hummus tabbouleh pita and tahini sauce on a white plate, vegetarian food photography"
  [box-strips]="crispy chicken strips with french fries and dipping sauce in a takeaway box, food photography, top view"
  [tacos]="chicken strip tacos in tortilla with cheese fries lettuce and sauce, food photography, top view"
  [zestaw-kebab-tortilla-sredni-cola]="kebab tortilla wrap with a glass bottle of cola on the side, restaurant combo meal, food photography"
  [zestaw-kapsalon-duzy-cola]="kapsalon kebab tray with melted cheese fries and a glass bottle of cola, combo meal, food photography"
  [frytki-male]="small portion of golden french fries in a paper cup with ketchup, food photography, white background"
  [frytki-duze]="large basket of crispy golden french fries with dipping sauce, food photography, top view"
  [baklawa]="traditional baklava pastry with pistachios and honey syrup on a small plate, dessert food photography"
  [coca-cola]="cold glass bottle of cola with condensation droplets on white background, product photography"
  [coca-cola-zero]="cold glass bottle of zero sugar cola with black label on white background, product photography"
  [coca-cola-light]="cold glass bottle of diet cola with silver label on white background, product photography"
  [fanta]="cold glass bottle of orange fanta soda on white background, product photography"
  [sprite]="cold glass bottle of clear lemon lime sprite soda on white background, product photography"
  [kinley]="cold glass bottle of tonic water on white background, product photography"
  [kropla-beskidu]="clear glass bottle of mineral water with blue label on white background, product photography"
  [fuze-tea]="cold glass bottle of peach iced tea on white background, product photography"
  [cappy]="small glass bottle of orange fruit juice on white background, product photography"
  [burn]="black aluminum can of energy drink on white background, product photography"
)

# Stable per-slug seed so re-downloads produce the same image.
seed_for() {
  local s=0
  local i=0
  while [ $i -lt ${#1} ]; do
    s=$(( (s * 31 + $(printf '%d' "'${1:$i:1}")) % 100000 ))
    i=$(( i + 1 ))
  done
  echo $s
}

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

total=${#PROMPTS[@]}
done=0
for slug in "${!PROMPTS[@]}"; do
  done=$((done + 1))
  out="$OUT_DIR/$slug.jpg"
  if [ -f "$out" ] && [ "$(stat -c%s "$out" 2>/dev/null || stat -f%z "$out")" -gt 5120 ]; then
    echo "[$done/$total] skip $slug.jpg (exists)"
    continue
  fi
  prompt="${PROMPTS[$slug]}"
  seed=$(seed_for "$slug")
  enc=$(urlencode "$prompt")
  url="https://image.pollinations.ai/prompt/${enc}?width=800&height=600&seed=${seed}&nologo=true&model=flux"
  echo "[$done/$total] downloading $slug.jpg (seed=$seed)"
  attempt=0
  while : ; do
    attempt=$((attempt + 1))
    if curl -sSL --max-time 180 -o "$out.tmp" "$url" \
       && size=$(stat -c%s "$out.tmp" 2>/dev/null || stat -f%z "$out.tmp") \
       && [ "$size" -ge 5120 ]; then
      mv "$out.tmp" "$out"
      break
    fi
    rm -f "$out.tmp"
    if [ "$attempt" -ge 3 ]; then
      echo "  ! gave up on $slug after $attempt attempts" >&2
      exit 1
    fi
    echo "  retry $attempt for $slug"
    sleep 2
  done
done

echo "done — $total images in $OUT_DIR"
