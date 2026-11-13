-- The shop's cats as chibi pixel art (FR-099, ADR-032), drawn by Aseprite
-- in batch mode:
--
--   aseprite -b --script-param looks=<looks.json> --script-param out=<dir> \
--     --script scripts/aseprite/cat-sprites.lua
--
-- `looks.json` holds the coats from src/lib/cats/cats.ts (written by
-- scripts/cat-sprites.ts). For each walking cat it saves `<id>.aseprite`, an
-- editable source with tagged animations, and for the sleigh `sleigh.aseprite`.
-- The sheets the site loads are exported from these with --split-tags.
--
-- Walking cats face right in a 48 x 40 frame and take 6 frames a step cycle.
-- Tags, one row each in the sheet: walk, look (glancing at the visitor),
-- meow (glancing, mouth open), then the same three with a red collar and a
-- gold bell for November and December.

local looks = json.decode(io.open(app.params.looks):read("a"))
local out = app.params.out

local W, H = 48, 40
local STEPS = 6

-- colours ---------------------------------------------------------------

local function hex(s)
  return {
    tonumber(s:sub(2, 3), 16),
    tonumber(s:sub(4, 5), 16),
    tonumber(s:sub(6, 7), 16),
  }
end

-- k < 1 darkens, k > 1 lightens toward white
local function tone(c, k)
  if k <= 1 then
    return { math.floor(c[1] * k), math.floor(c[2] * k), math.floor(c[3] * k) }
  end
  local t = k - 1
  return {
    math.floor(c[1] + (255 - c[1]) * t),
    math.floor(c[2] + (255 - c[2]) * t),
    math.floor(c[3] + (255 - c[3]) * t),
  }
end

local function luma(c)
  return 0.3 * c[1] + 0.59 * c[2] + 0.11 * c[3]
end

-- shade toward darker, but lift very dark coats so the shading still shows
local function shade(c)
  if luma(c) < 50 then return tone(c, 0.6) end
  return tone(c, 0.82)
end
local function light(c)
  if luma(c) < 50 then return tone(c, 1.12) end
  return tone(c, 1.1)
end
local function line(c)
  if luma(c) < 50 then return { 10, 9, 12 } end
  return tone(c, 0.42)
end

local INK = { 34, 26, 30 }
local WHITE = { 255, 255, 255 }
local BLUSH = { 242, 156, 168 }
local MOUTH = { 107, 42, 52 }
local TONGUE = { 233, 128, 140 }
local RED = { 200, 40, 52 }
local RED_DARK = { 130, 22, 34 }
local GOLD = { 232, 186, 60 }
local GOLD_DARK = { 150, 104, 26 }

-- a pixel canvas ---------------------------------------------------------

local function canvas(w, h)
  return { w = w, h = h, px = {} }
end

local function set(c, x, y, col)
  x, y = math.floor(x), math.floor(y)
  if x < 0 or y < 0 or x >= c.w or y >= c.h then return end
  c.px[y * c.w + x] = col
end

local function get(c, x, y)
  x, y = math.floor(x), math.floor(y)
  if x < 0 or y < 0 or x >= c.w or y >= c.h then return nil end
  return c.px[y * c.w + x]
end

-- Paint a shape given by `inside(x, y)` (pixel centres). With an outline
-- colour, the ring just outside the shape is inked first, so the shape pops
-- from whatever is behind it. `colour(x, y)` picks each pixel's colour.
-- `clip(x, y)` limits where it may paint.
local function shape(c, inside, colour, outline, clip)
  local mask = {}
  for y = 0, c.h - 1 do
    for x = 0, c.w - 1 do
      if inside(x + 0.5, y + 0.5) and (not clip or clip(x, y)) then
        mask[y * c.w + x] = true
      end
    end
  end
  if outline then
    for y = 0, c.h - 1 do
      for x = 0, c.w - 1 do
        local i = y * c.w + x
        if not mask[i] then
          local near = (x > 0 and mask[i - 1])
            or (x < c.w - 1 and mask[i + 1])
            or (y > 0 and mask[i - c.w])
            or (y < c.h - 1 and mask[i + c.w])
          if near then set(c, x, y, outline) end
        end
      end
    end
  end
  for i in pairs(mask) do
    local x, y = i % c.w, i // c.w
    set(c, x, y, colour(x, y))
  end
  return mask
end

local function ellipse(cx, cy, rx, ry)
  return function(x, y)
    local dx, dy = (x - cx) / rx, (y - cy) / ry
    return dx * dx + dy * dy <= 1
  end
end

-- a triangle given by three points
local function triangle(ax, ay, bx, by, qx, qy)
  local function side(px, py, x1, y1, x2, y2)
    return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
  end
  return function(x, y)
    local d1 = side(x, y, ax, ay, bx, by)
    local d2 = side(x, y, bx, by, qx, qy)
    local d3 = side(x, y, qx, qy, ax, ay)
    local neg = d1 < 0 or d2 < 0 or d3 < 0
    local pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)
  end
end

-- a round-ended bar between two points
local function capsule(x1, y1, x2, y2, r)
  return function(x, y)
    local dx, dy = x2 - x1, y2 - y1
    local len2 = dx * dx + dy * dy
    local t = len2 > 0 and math.max(0, math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2)) or 0
    local ex, ey = x - (x1 + t * dx), y - (y1 + t * dy)
    return ex * ex + ey * ey <= r * r
  end
end

local function union(list)
  return function(x, y)
    for _, f in ipairs(list) do
      if f(x, y) then return true end
    end
    return false
  end
end

-- flat colour, darker toward the bottom, a little lighter at the top
local function shaded(base, cy, ry)
  local dark, lit = shade(base), light(base)
  return function(_, y)
    if y + 0.5 > cy + ry * 0.45 then return dark end
    if y + 0.5 < cy - ry * 0.55 then return lit end
    return base
  end
end

local function flat(col)
  return function() return col end
end

-- parts ------------------------------------------------------------------

-- one big kawaii eye: dark, the iris showing at the bottom, two glints
local function eye(c, x, y, iris, small)
  local h = small and 3 or 4
  for dy = 0, h - 1 do
    for dx = 0, 2 do
      set(c, x + dx, y + dy, INK)
    end
  end
  for dx = 0, 2 do
    set(c, x + dx, y + h - 1, iris)
  end
  set(c, x + 1, y + h - 1, tone(iris, 0.75))
  set(c, x, y, WHITE)
  if not small then set(c, x + 2, y + 2, tone(WHITE, 0.92)) end
end

-- the head; `front` looks at the visitor, otherwise three-quarters right
local function head(c, look, cx, cy, opts)
  local coat = hex(look.coat)
  local ink = line(coat)
  local ears = hex(look.ears)
  local inner = hex(look.innerEar)
  local front = opts.front
  local ox = front and 0 or 1 -- turn the face a little toward the nose
  -- ears behind the head
  local earL = triangle(cx - 9, cy - 3, cx - 7, cy - 13, cx - 1, cy - 7)
  local earR = triangle(cx + 9, cy - 3, cx + 7, cy - 13, cx + 1, cy - 7)
  shape(c, earL, flat(ears), line(ears))
  shape(c, earR, flat(ears), line(ears))
  shape(c, triangle(cx - 7.5, cy - 5, cx - 6.5, cy - 10.5, cx - 3, cy - 7), flat(inner))
  shape(c, triangle(cx + 7.5, cy - 5, cx + 6.5, cy - 10.5, cx + 3, cy - 7), flat(inner))
  -- the round head, wider than tall
  local rx, ry = 10.5, 8.8
  local mask = shape(c, ellipse(cx, cy, rx, ry), shaded(coat, cy, ry), ink)
  local function onHead(x, y)
    return mask[y * c.w + x]
  end
  -- Luna's grey cap
  if look.cap then
    shape(c, ellipse(cx, cy - 8, 8, 4.5), flat(hex(look.cap)), nil, onHead)
  end
  -- the muzzle
  local mx, my = cx + 3 * ox, cy + 4
  local muzzle = hex(look.muzzle)
  shape(c, ellipse(mx - 0.5, my + 0.5, 3.6, 2.4), flat(muzzle), nil, onHead)
  -- eyes, far one a little smaller when turned
  local eyeL, eyeR = hex(look.eyeLeft), hex(look.eyeRight)
  local ey = cy - 2
  if opts.sleepy then
    for _, ex in ipairs({ mx - 6, mx + 4 }) do
      set(c, ex, ey + 2, INK)
      set(c, ex + 1, ey + 1, INK)
      set(c, ex + 2, ey + 2, INK)
    end
  else
    eye(c, mx - 7, ey, eyeL, not front)
    eye(c, mx + 4, ey, eyeR, false)
  end
  -- rosy cheeks
  set(c, mx - 8, cy + 3, BLUSH)
  set(c, mx - 7, cy + 3, BLUSH)
  set(c, mx + 6, cy + 3, BLUSH)
  set(c, mx + 7, cy + 3, BLUSH)
  -- nose and mouth
  local nose = hex(look.nose)
  set(c, mx - 1, my - 1, nose)
  set(c, mx, my - 1, nose)
  local mouthInk = luma(muzzle) < 90 and tone(muzzle, 0.45) or tone(coat, 0.45)
  if opts.meow then
    for dy = 0, 2 do
      for dx = -1, 1 do
        set(c, mx - 0.5 + dx, my + 1 + dy, MOUTH)
      end
    end
    set(c, mx - 1, my + 3, TONGUE)
    set(c, mx, my + 3, TONGUE)
  else
    set(c, mx - 2, my + 1, mouthInk)
    set(c, mx - 1, my + 2, mouthInk)
    set(c, mx, my + 2, mouthInk)
    set(c, mx + 1, my + 1, mouthInk)
  end
  -- whiskers, two a side
  local wh = luma(coat) < 60 and { 230, 230, 230 } or tone(coat, 0.55)
  for _, s in ipairs({ { -1, mx - 6 }, { 1, mx + 5 } }) do
    local dir, x0 = s[1], s[2]
    for i = 0, 3 do
      if not get(c, x0 + dir * (i + 4), my) or i > 1 then
        set(c, x0 + dir * (i + 4), my - (i // 2), wh)
        set(c, x0 + dir * (i + 4), my + 2 + (i // 2), wh)
      end
    end
  end
  return mask
end

-- a walking cat, facing right
local function walker(look, step, mode, festive)
  local c = canvas(W, H)
  local coat = hex(look.coat)
  local ink = line(coat)
  local chest = hex(look.chest)
  local paws = hex(look.paws)
  local p = step / STEPS * 2 * math.pi
  local bob = (step == 1 or step == 4) and 1 or 0
  local ground = H - 3

  -- legs: diagonal pairs swing together, far legs darker and behind
  local function leg(x, phase, far)
    local a = p + phase
    local dx = math.floor(3.4 * math.sin(a) + 0.5)
    local lift = math.cos(a) > 0.5 and 2 or (math.cos(a) > 0 and 1 or 0)
    local top = 29 + bob
    local bottom = ground - lift
    local fur = far and shade(coat) or coat
    local paw = far and shade(paws) or paws
    shape(
      c,
      capsule(x + dx * 0.3, top, x + dx, bottom - 1, 2.1),
      function(_, y)
        if y >= bottom - 2 then return paw end
        return fur
      end,
      ink
    )
  end
  leg(28, math.pi, true) -- far front
  leg(16, 0, true) -- far back

  -- the tail, held up with a curl, swaying a little
  local sway = math.sin(p) * 1.2
  local parts = {}
  local prevx, prevy = 13, 26 + bob
  for i = 1, 8 do
    local t = i / 8
    local x = 13 - 5 * math.sin(t * 1.6) + sway * t * t + 4 * t ^ 4
    local y = 26 + bob - 19 * t
    parts[#parts + 1] = capsule(prevx, prevy, x, y, 2.4 - t * 0.5)
    prevx, prevy = x, y
  end
  local tail, tip = hex(look.tail), hex(look.tailTip)
  shape(c, union(parts), function(_, y)
    if y < 26 + bob - 15 then return tip end
    return tail
  end, line(tail))

  -- a round, plush body
  local by = 25 + bob
  local body = shape(c, ellipse(22, by, 11.5, 7.2), shaded(coat, by, 7.2), ink)
  shape(c, ellipse(28, by + 3, 6, 4.2), flat(chest), nil, function(x, y)
    return body[y * c.w + x]
  end)

  leg(26, 0, false) -- near front
  leg(14, math.pi, false) -- near back

  -- the big head up front
  local hx, hy = 33, 14 + bob
  local headMask = head(c, look, hx, hy, {
    front = mode ~= "walk",
    meow = mode == "meow",
  })

  -- a red collar and gold bell in the holidays; a name tag otherwise
  if festive then
    for x = hx - 7, hx + 4 do
      local y = hy + 8 + ((x < hx - 3) and 0 or 1)
      if headMask[(y - 1) * W + x] or get(c, x, y) then
        set(c, x, y, RED)
        set(c, x, y - 1, RED_DARK)
      end
    end
    set(c, hx - 1, hy + 10, GOLD)
    set(c, hx, hy + 10, GOLD)
    set(c, hx - 1, hy + 11, GOLD_DARK)
    set(c, hx, hy + 11, GOLD_DARK)
    set(c, hx - 1, hy + 10, light(GOLD))
  elseif look.tag then
    set(c, hx - 1, hy + 9, hex(look.tag))
    set(c, hx, hy + 9, hex(look.tag))
    set(c, hx - 1, hy + 10, shade(hex(look.tag)))
  end
  return c
end

-- the coffee-cup sleigh with Luna resting and her kittens, facing right
local SW, SH = 72, 44
local function sleigh(luna, kittens, step)
  local c = canvas(SW, SH)
  local bob = (step == 1 or step == 2) and 1 or 0
  local cream = { 239, 228, 208 }
  local band = { 29, 90, 58 }
  local brown = { 92, 62, 44 }

  -- Luna's tail curled over the back of the cup
  shape(c, capsule(30, 21 + bob, 5, 19 + bob, 2.2), flat(hex(luna.tail)), line(hex(luna.tail)))
  -- Luna lying along the rim, tail over the back
  local lc = hex(luna.coat)
  local lb = shape(c, ellipse(38, 20 + bob, 13, 5.5), shaded(lc, 21 + bob, 5.5), line(lc))
  shape(c, ellipse(36, 17 + bob, 6, 2.5), flat(hex(luna.cap or luna.coat)), nil, function(x, y)
    return lb[y * c.w + x]
  end)
    -- her head at the front, facing the visitor, eyes closed and content
  head(c, luna, 50, 15 + bob, { front = true, sleepy = true })
  -- front paws over the rim
  shape(c, ellipse(42, 25 + bob, 2.6, 1.8), flat(hex(luna.paws)), line(hex(luna.paws)))
  shape(c, ellipse(47, 25 + bob, 2.6, 1.8), flat(hex(luna.paws)), line(hex(luna.paws)))

  -- kittens peeking over the back of the cup
  for i, k in ipairs(kittens) do
    local kx = 11 + (i - 1) * 9
    local ky = 19 + bob + ((i + step) % 3 == 0 and 1 or 0)
    local coat = hex(k.coat)
    local kink = line(coat)
    shape(c, triangle(kx - 4.5, ky - 1, kx - 3.5, ky - 7, kx - 0.5, ky - 3), flat(hex(k.ears)), line(hex(k.ears)))
    shape(c, triangle(kx + 4.5, ky - 1, kx + 3.5, ky - 7, kx + 0.5, ky - 3), flat(hex(k.ears)), line(hex(k.ears)))
    shape(c, ellipse(kx, ky + 1, 5.2, 4.6), shaded(coat, ky + 1, 4.6), kink)
    if k.cap then
      shape(c, ellipse(kx, ky - 3, 4, 2.2), flat(hex(k.cap)), nil, ellipse(kx, ky + 1, 5.2, 4.6))
    end
    local blink = (step + i) % 4 == 0
    for _, ex in ipairs({ kx - 3, kx + 2 }) do
      if blink then
        set(c, ex, ky + 1, INK)
        set(c, ex + 1, ky + 1, INK)
      else
        set(c, ex, ky, WHITE)
        set(c, ex + 1, ky, INK)
        set(c, ex, ky + 1, INK)
        set(c, ex + 1, ky + 1, INK)
      end
    end
    set(c, kx - 0.5, ky + 2, hex(k.nose))
    set(c, kx - 4, ky + 2, BLUSH)
    set(c, kx + 4, ky + 2, BLUSH)
  end

  -- the cup, narrower at the bottom, a green band and a handle at the back
  local cup = function(x, y)
    if y < 24 or y > 38 then return false end
    local t = (y - 24) / 14
    return x >= 8 + 4 * t and x <= 58 - 4 * t
  end
  shape(c, capsule(6, 28, 6, 33, 3.2), flat(cream), brown)
  shape(c, capsule(6, 28, 6, 33, 1.2), flat({ 0, 0, 0, 0 }))
  shape(c, cup, function(x, y)
    if y >= 29 and y <= 31 then return band end
    if y >= 36 then return shade(cream) end
    if x >= 50 then return shade(cream) end
    return cream
  end, brown)
  -- a red bow on the band
  set(c, 33, 30, RED)
  set(c, 34, 30, RED_DARK)
  set(c, 35, 30, RED)
  set(c, 32, 29, RED)
  set(c, 36, 29, RED)
  set(c, 32, 31, RED)
  set(c, 36, 31, RED)

  -- golden runners, curling up at the front
  for x = 6, 62 do
    local y = 41
    if x > 58 then y = 41 - (x - 58) * 1.5 end
    set(c, x, math.floor(y), GOLD)
    set(c, x, math.floor(y) + 1, GOLD_DARK)
  end
  set(c, 63, 35, GOLD)
  set(c, 62, 34, GOLD)
  for _, x in ipairs({ 16, 30, 44 }) do
    set(c, x, 39, GOLD_DARK)
    set(c, x, 40, GOLD_DARK)
  end
  return c
end

-- to Aseprite --------------------------------------------------------------

local function toImage(c)
  local img = Image(c.w, c.h, ColorMode.RGB)
  img:clear(app.pixelColor.rgba(0, 0, 0, 0))
  for i, col in pairs(c.px) do
    local a = col[4] == nil and 255 or col[4]
    img:drawPixel(i % c.w, i // c.w, app.pixelColor.rgba(col[1], col[2], col[3], a))
  end
  return img
end

-- a sprite whose frames come from `frames` (a list of canvases), tagged
local function save(path, w, h, groups)
  local spr = Sprite(w, h, ColorMode.RGB)
  local layer = spr.layers[1]
  layer.name = "cat"
  local total = 0
  for _, g in ipairs(groups) do total = total + #g.frames end
  for _ = 2, total do spr:newEmptyFrame() end
  local n = 0
  for _, g in ipairs(groups) do
    local first = n + 1
    for _, f in ipairs(g.frames) do
      n = n + 1
      spr:newCel(layer, n, toImage(f), Point(0, 0))
      spr.frames[n].duration = g.duration
    end
    local tag = spr:newTag(first, n)
    tag.name = g.name
  end
  spr:saveAs(path)
  spr:close()
end

local MODES = { "walk", "look", "meow" }
for _, cat in ipairs(looks.walkers) do
  local groups = {}
  for _, festive in ipairs({ false, true }) do
    for _, mode in ipairs(MODES) do
      local frames = {}
      for step = 0, STEPS - 1 do
        frames[#frames + 1] = walker(cat.look, step, mode, festive)
      end
      groups[#groups + 1] = {
        name = festive and (mode .. "-festive") or mode,
        frames = frames,
        duration = 0.11,
      }
    end
  end
  save(out .. "/" .. cat.id .. ".aseprite", W, H, groups)
end

local frames = {}
for step = 0, 3 do
  frames[#frames + 1] = sleigh(looks.luna, looks.kittens, step)
end
save(out .. "/sleigh.aseprite", SW, SH, { { name = "ride", frames = frames, duration = 0.18 } })
