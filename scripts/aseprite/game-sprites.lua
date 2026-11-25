-- The games' pixel art (ADR-032), drawn by Aseprite in batch mode:
--
--   aseprite -b --script-param icons=<names> --script-param out=<dir> \
--     --script-param android=<dir> --script-param web=<dir> \
--     --script scripts/aseprite/game-sprites.lua
--
-- `icons` lists the icon names, comma separated, in the sheet's order
-- (GAME_ICONS in src/lib/games/sprites.ts; scripts/game-sprites.mts passes
-- them). Saves the editable sources in <out>: icons.aseprite (16 x 16, one
-- tag per icon), hiding-cup.aseprite (Cat Cups, 40 x 36: cup and cup-lit),
-- treat-jar.aseprite (Lucky Paw, 48 x 56) and stack-block.aseprite (Cup
-- Stack, 16 x 12: block and block-lit). The Android app gets each frame as
-- its own PNG, <android>/game_<name>.png; the stack blocks also go to
-- <web>/stack-block.png and stack-block-lit.png for a CSS 9-slice.
--
-- An icon is a grid of palette letters. Only the fill is drawn: each empty
-- pixel next to a filled one becomes the dark outline, so every shape gets a
-- 1 px border with rounded corners. Steam ('s') casts no outline.

local names = {}
for name in app.params.icons:gmatch("[^,]+") do names[#names + 1] = name end
local out = app.params.out
local android = app.params.android
local web = app.params.web

local function hex(s)
  return {
    tonumber(s:sub(2, 3), 16),
    tonumber(s:sub(4, 5), 16),
    tonumber(s:sub(6, 7), 16),
  }
end

local PALETTE = {
  K = hex("#2b1d24"), -- outline and ink
  W = hex("#ffffff"),
  w = hex("#f4e6cf"), -- cream
  G = hex("#d5cdd3"),
  g = hex("#9b9099"),
  O = hex("#f28c3a"),
  o = hex("#b9581d"),
  h = hex("#ffbf80"), -- orange, lit
  Y = hex("#f8cb4a"),
  y = hex("#b88a1e"),
  B = hex("#5aa8e8"),
  b = hex("#2f6db3"),
  L = hex("#aad9f8"),
  j = hex("#7fbde6"), -- glass in shade
  R = hex("#e23d3d"),
  r = hex("#93202c"),
  P = hex("#f5a3b5"),
  p = hex("#cc6681"),
  N = hex("#a8693f"),
  n = hex("#6a3f24"),
  T = hex("#deae79"),
  E = hex("#5bb352"),
  e = hex("#2f6e30"),
  C = hex("#5a3524"),
  s = hex("#b4aab2"), -- steam
}
local NO_OUTLINE = { s = true }

-- the icons, 16 x 16 ----------------------------------------------------

local ICONS = {}

ICONS.fish = {
  "................",
  "................",
  "................",
  "......bbb.......",
  ".....bbbb....bb.",
  "...bbbbbbbb.bbb.",
  "..BBWKBBBBBBBB..",
  ".BBBKKBBBBBBB...",
  ".LLLLLLLLLBBB...",
  "..LLLLLLLLLBBB..",
  "...LLLLLLLL.bbb.",
  ".....LLLL....bb.",
  "................",
  "................",
  "................",
  "................",
}

ICONS.tea = {
  "................",
  ".........P......",
  ".........P......",
  ".....wwwwPw.....",
  "...wwwwwwwwww...",
  "..GGGGGGGGGGGG..",
  "...TTTTTTTTTT...",
  "...TTTTTTTTTT...",
  "...TWTTTTTTTT...",
  "....TWTTTTTT....",
  "....TTTTTTTT....",
  "....TnTTTnTT....",
  ".....TnTTnT.....",
  ".....nTnnTn.....",
  "................",
  "................",
}

ICONS.chili = {
  "................",
  "............e...",
  "...........ee...",
  ".........EEEE...",
  "........RPRRr...",
  ".......RPRRRr...",
  "......RPRRRr....",
  ".....RPRRRRr....",
  "....RPRRRRr.....",
  "...RPRRRRr......",
  "..RRRRRRr.......",
  "..RRRRr.........",
  "..RRr...........",
  "..Rr............",
  "................",
  "................",
}

ICONS.mouse = {
  "................",
  "..ggg......ggg..",
  ".gPPPg....gPPPg.",
  ".gPPPg....gPPPg.",
  ".gPPGGGGGGGGPPg.",
  "..ggGGGGGGGGgg..",
  "..GGGGGGGGGGGG..",
  "..GGGKGGGGKGGG..",
  "..GGGKGGGGKGGG..",
  "..GPGGGGGGGGPG..",
  "...GGGGPPGGGG...",
  "...GGGGGGGGGG...",
  "....GGGGGGGG....",
  ".....GGGGGG.....",
  "................",
  "................",
}

ICONS.cup = {
  "................",
  ".........R......",
  "....GGGGGRGG....",
  "...gggggggggg...",
  "....WWWWWWWG....",
  "....WWWWWWWG....",
  "....OOOOOOOo....",
  "....OOOOOOOo....",
  "....OOOOOOOo....",
  ".....OOOOOo.....",
  ".....WWWWWG.....",
  ".....WWWWWG.....",
  ".....WWWWWG.....",
  "......wwww......",
  "................",
  "................",
}

ICONS.paw = {
  "................",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "................",
  ".PPP........PPP.",
  ".PPP........PPP.",
  ".PPP........PPP.",
  ".....PPPPPP.....",
  "....PWPPPPPP....",
  "...PPPPPPPPPP...",
  "...PPPPPPPPPP...",
  "...PPPPPPPPPp...",
  "....pPPPPPPp....",
  "................",
  "................",
}

ICONS.card = {
  "................",
  "...WWWWWWWWWG...",
  "...WRWWWWWWWG...",
  "...WWWWWWWWWG...",
  "...WWWWWWWWWG...",
  "...WWWWWWWWWG...",
  "...WWRRWWRRWG...",
  "...WWRRRRRRWG...",
  "...WWWRRRRWWG...",
  "...WWWWRRWWWG...",
  "...WWWWWWWWWG...",
  "...WWWWWWWWWG...",
  "...WWWWWWWWWG...",
  "...WWWWWWWWRG...",
  "...GGGGGGGGGG...",
  "................",
}

ICONS.cat = {
  "................",
  "..O..........O..",
  "..OO........OO..",
  "..OPO......OPO..",
  "..OPOOOOOOOOPO..",
  ".OOOOOoOOoOOOOO.",
  ".OOOOOOooOOOOOO.",
  ".OOOOOOOOOOOOOO.",
  ".OOOOKOOOOKOOOO.",
  ".OOOOKOOOOKOOOO.",
  ".OwwOOOPPOOOwwO.",
  "..OOOwwKKwwOOO..",
  "...OOOwwwwOOO...",
  ".....OOOOOO.....",
  "................",
  "................",
}

ICONS.fries = {
  "................",
  ".....Y..y..Y....",
  "....yY.Yy.yY....",
  "....yYYYyYyY....",
  "....yYyYyYyY....",
  "...RRRRRRRRRR...",
  "...RRRRRRRRRr...",
  "...RWWWWWWWWr...",
  "...RRRRRRRRRr...",
  "....RRRRRRRr....",
  "....RRRRRRRr....",
  "....RRRRRRRr....",
  ".....RRRRRr.....",
  ".....RRRRRr.....",
  "................",
  "................",
}

ICONS.milk = {
  "................",
  "................",
  "....LLLLLLLL....",
  "....LLLLLLLL....",
  "....wwwwwwww....",
  "....WWWWWWWG....",
  "....WLWWWWWG....",
  "....WLWWWWWG....",
  "....WWWWWWWG....",
  "....WWWWWWWG....",
  "....WWWWWWWG....",
  "....WWWWWWWG....",
  "....WWWWWWWG....",
  "....LLLLLLLL....",
  "................",
  "................",
}

ICONS.ramen = {
  "................",
  "............Nn..",
  "...........Nn...",
  "..........Nn....",
  ".........Nn.....",
  "..TTTTTTNnTTTT..",
  "..YyYwOwYyYyYy..",
  ".RRRRRRRRRRRRRR.",
  ".RRWRRWRRWRRWRr.",
  "..RRRRRRRRRRRr..",
  "...RRRRRRRRRr...",
  "....rrrrrrrr....",
  ".....rrrrrr.....",
  "................",
  "................",
  "................",
}

ICONS.coffee = {
  "................",
  ".....s...s......",
  "......s...s.....",
  ".....s...s......",
  "................",
  "..wwwwwwwww.....",
  "..wCCCCCCCw.....",
  "..wwwwwwwwTww...",
  "..wwwwwwwwT.w...",
  "..wwwwwwwwT.w...",
  "..wwwwwwwwTww...",
  "..wwwwwwwwT.....",
  "...wwwwwwT......",
  "................",
  "................",
  "................",
}

ICONS.heart = {
  "................",
  "................",
  "................",
  "...RRR....RRR...",
  "..RWRRR..RRRRR..",
  ".RWRRRRRRRRRRRR.",
  ".RRRRRRRRRRRRRr.",
  "..RRRRRRRRRRRr..",
  "...RRRRRRRRRr...",
  "....RRRRRRRr....",
  ".....RRRRRr.....",
  "......RRRr......",
  ".......Rr.......",
  "................",
  "................",
  "................",
}

ICONS.trophy = {
  "................",
  "................",
  "...YYYYYYYYYY...",
  ".YYYWYYYYYYYyYY.",
  ".Y.YWYYYYYYYy.Y.",
  "..YYWYYYYYYyYY..",
  "...YYYYYYYYYy...",
  "....YYYYYYYy....",
  ".....YYYYYy.....",
  "......yYYy......",
  ".......Yy.......",
  ".......Yy.......",
  ".....YYYYYy.....",
  "....nnnnnnnn....",
  "....NNNNNNNN....",
  "................",
}

ICONS.flame = {
  "................",
  ".......R........",
  "......RO........",
  "......OOO.......",
  ".....OOOO...R...",
  "....ROOOO..RO...",
  "....OOOOOOOOO...",
  "...OOOOYOOOOO...",
  "...OOOYYYOOOOO..",
  "..OOOYYYYYOOOO..",
  "..OOYYYWYYYOOO..",
  "..OOYYWWWYYOOO..",
  "...OOYYWYYOOO...",
  "....OOOYYOOO....",
  "......OOOO......",
  "................",
}

ICONS.sparkle = {
  "................",
  "...........Y....",
  "..........YYY...",
  "...........Y....",
  "................",
  "......Y.........",
  "......Y.........",
  ".....YYY........",
  "....YYWYY.......",
  "..YYYWWWYYY.....",
  "....YYWYY.......",
  ".....YYY....Y...",
  "......Y....YYY..",
  "......Y.....Y...",
  "................",
  "................",
}

ICONS.clock = {
  "................",
  ".......gg.......",
  "......gggg......",
  ".....WWWWWW.....",
  "...WWWWWWWWWW...",
  "..WWWWWKWWWWWW..",
  ".WWWWWWKWWWWWWW.",
  ".WWWWWWKWWWWWWW.",
  ".WWWWWWKKKKWWWW.",
  ".WWWWWWWWWWWWWW.",
  ".WWWWWWWWWWWWWG.",
  "..WWWWWWWWWWWG..",
  "...GWWWWWWWWG...",
  ".....GGGGGG.....",
  "................",
  "................",
}

-- the same grid in other colours
local function recolour(rows, map)
  local copy = {}
  for i, row in ipairs(rows) do
    copy[i] = (row:gsub(".", function(ch) return map[ch] end))
  end
  return copy
end

ICONS["mouse-gold"] = recolour(ICONS.mouse, { G = "Y", g = "y" })
ICONS["heart-empty"] = recolour(ICONS.heart, { R = "G", r = "g" })
ICONS["paw-white"] = recolour(ICONS.paw, { P = "W", p = "G" })

-- a pixel canvas ---------------------------------------------------------

local function canvas(w, h)
  return { w = w, h = h, px = {} }
end

local function set(c, x, y, letter)
  if x < 0 or y < 0 or x >= c.w or y >= c.h then return end
  c.px[y * c.w + x] = letter
end

local function get(c, x, y)
  if x < 0 or y < 0 or x >= c.w or y >= c.h then return nil end
  return c.px[y * c.w + x]
end

local function fromGrid(name, rows)
  assert(#rows == 16, name .. " is " .. #rows .. " rows tall")
  local c = canvas(16, 16)
  for y, row in ipairs(rows) do
    assert(#row == 16, name .. " row " .. y .. " is " .. #row .. " wide")
    for x = 1, 16 do
      local ch = row:sub(x, x)
      if ch ~= "." then
        assert(PALETTE[ch], name .. " has no colour " .. ch)
        set(c, x - 1, y - 1, ch)
      end
    end
  end
  return c
end

-- every empty pixel beside the fill becomes the outline
local function outline(c)
  local edge = {}
  for y = 0, c.h - 1 do
    for x = 0, c.w - 1 do
      if get(c, x, y) == nil then
        for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
          local n = get(c, x + d[1], y + d[2])
          if n and not NO_OUTLINE[n] then
            edge[#edge + 1] = { x, y }
            break
          end
        end
      end
    end
  end
  for _, p in ipairs(edge) do set(c, p[1], p[2], "K") end
  return c
end

-- Cat Cups' cup, 40 x 36 ---------------------------------------------------

local function hidingCup(lit)
  local c = canvas(40, 36)
  local body, shade, shine = "O", "o", "h"
  if lit then body, shade, shine = "h", "O", "w" end
  -- the cup upside down: a narrow top, the wide mouth on the table
  local function edges(y)
    local t = (y - 2) / 27
    return math.floor(11 - 4 * t + 0.5), math.floor(28 + 4 * t + 0.5)
  end
  for y = 2, 29 do
    local l, r = edges(y)
    if y == 2 then l, r = l + 1, r - 1 end
    for x = l, r do
      local col = body
      if x <= l + 1 then col = shine elseif x >= r - 2 then col = shade end
      set(c, x, y, col)
    end
  end
  -- a cream sleeve
  for y = 11, 14 do
    local l, r = edges(y)
    for x = l, r do set(c, x, y, x >= r - 2 and "T" or "w") end
  end
  -- a paw print under the sleeve
  for _, p in ipairs({ { 17, 19 }, { 19, 18 }, { 20, 18 }, { 22, 19 },
    { 18, 20 }, { 19, 20 }, { 20, 20 }, { 21, 20 },
    { 18, 21 }, { 19, 21 }, { 20, 21 }, { 21, 21 },
    { 19, 22 }, { 20, 22 } }) do
    set(c, p[1], p[2], shade)
  end
  -- the rim on the table
  for y = 30, 33 do
    for x = 4, 35 do set(c, x, y, y == 30 and "N" or "n") end
  end
  set(c, 4, 30, nil)
  set(c, 35, 30, nil)
  return outline(c)
end

-- Lucky Paw's treat jar, 48 x 56 -------------------------------------------

local function disc(c, cx, cy, rad, fill, ring)
  for y = cy - rad, cy + rad do
    for x = cx - rad, cx + rad do
      local d = (x - cx) ^ 2 + (y - cy) ^ 2
      if d <= rad * rad + 1 then
        set(c, x, y, d >= (rad - 1) ^ 2 + 1 and ring or fill)
      end
    end
  end
end

local function treatJar()
  local c = canvas(48, 56)
  -- the lid, with a groove
  for y = 2, 8 do
    for x = 12, 35 do set(c, x, y, (y == 2 or y == 5) and "N" or "n") end
  end
  set(c, 12, 2, nil)
  set(c, 35, 2, nil)
  -- the neck
  for y = 9, 10 do
    for x = 15, 32 do set(c, x, y, "G") end
  end
  -- the glass: a rounded box, lit on the left
  local L, R, T, B, rad = 4, 43, 11, 53, 7
  for y = T, B do
    for x = L, R do
      local dx = math.max(L + rad - x, 0, x - (R - rad))
      local dy = math.max(T + rad - y, 0, y - (B - rad))
      if dx * dx + dy * dy <= rad * rad + rad then
        local col = "L"
        if x >= R - 3 then col = "j" end
        set(c, x, y, col)
      end
    end
  end
  for y = T + 6, B - 12 do
    set(c, L + 3, y, "W")
    set(c, L + 4, y, "W")
  end
  -- treats piled inside
  local treats = {
    { 11, 47, "T", "N" }, { 36, 47, "O", "o" }, { 29, 49, "T", "N" },
    { 18, 49, "O", "o" }, { 15, 42, "O", "o" }, { 24, 46, "T", "N" },
    { 32, 41, "O", "o" }, { 38, 39, "T", "N" }, { 19, 34, "T", "N" },
    { 29, 33, "O", "o" }, { 23, 39, "O", "o" }, { 10, 37, "T", "N" },
  }
  for _, t in ipairs(treats) do
    disc(c, t[1], t[2], 3, t[3], t[4])
    set(c, t[1] - 1, t[2] - 1, "W")
  end
  -- a cream label with a paw print
  for y = 18, 26 do
    for x = 15, 32 do
      local col = "w"
      if y == 18 or y == 26 or x == 15 or x == 32 then col = "T" end
      set(c, x, y, col)
    end
  end
  for _, p in ipairs({ { 21, 21 }, { 23, 20 }, { 24, 20 }, { 26, 21 },
    { 22, 22 }, { 23, 22 }, { 24, 22 }, { 25, 22 },
    { 22, 23 }, { 23, 23 }, { 24, 23 }, { 25, 23 },
    { 23, 24 }, { 24, 24 } }) do
    set(c, p[1], p[2], "n")
  end
  return outline(c)
end

-- Cup Stack's block, 16 x 12: a cup's sleeve seen from the side. It is
-- drawn as a 9-slice (4 px corners), so the tower's blocks can be any width;
-- `block-lit` is the one still sliding.

local function stackBlock(lit)
  local c = canvas(16, 12)
  local body, shade, shine = "O", "o", "h"
  if lit then body, shade, shine = "h", "O", "w" end
  for y = 1, 10 do
    for x = 1, 14 do
      local col = body
      if y == 1 or x == 1 then col = shine end
      if y >= 4 and y <= 6 then col = "w" end
      if y >= 9 or x == 14 then col = shade end
      set(c, x, y, col)
    end
  end
  for _, p in ipairs({ { 1, 1 }, { 14, 1 }, { 1, 10 }, { 14, 10 } }) do
    set(c, p[1], p[2], nil)
  end
  return outline(c)
end

-- to Aseprite --------------------------------------------------------------

local function toImage(c)
  local img = Image(c.w, c.h, ColorMode.RGB)
  img:clear(app.pixelColor.rgba(0, 0, 0, 0))
  for i, letter in pairs(c.px) do
    local col = PALETTE[letter]
    img:drawPixel(i % c.w, i // c.w, app.pixelColor.rgba(col[1], col[2], col[3], 255))
  end
  return img
end

-- a sprite with a tag a frame; `frames` is a list of { name, canvas }
local function save(file, w, h, frames)
  local spr = Sprite(w, h, ColorMode.RGB)
  local layer = spr.layers[1]
  layer.name = "art"
  for _ = 2, #frames do spr:newEmptyFrame() end
  for n, f in ipairs(frames) do
    spr:newCel(layer, n, toImage(f.canvas), Point(0, 0))
    local tag = spr:newTag(n, n)
    tag.name = f.name
  end
  spr:saveAs(out .. "/" .. file)
  spr:close()
end

-- one frame on its own
local function writePng(file, c)
  local spr = Sprite(c.w, c.h, ColorMode.RGB)
  spr:newCel(spr.layers[1], 1, toImage(c), Point(0, 0))
  spr:saveCopyAs(file)
  spr:close()
end

-- the Android app's copy: res/drawable-nodpi/game_<name>.png
local function png(name, c)
  writePng(android .. "/game_" .. name:gsub("-", "_") .. ".png", c)
end

local icons = {}
for _, name in ipairs(names) do
  assert(ICONS[name], "no icon called " .. name)
  icons[#icons + 1] = { name = name, canvas = outline(fromGrid(name, ICONS[name])) }
end
local cups = {
  { name = "cup", canvas = hidingCup(false) },
  { name = "cup-lit", canvas = hidingCup(true) },
}
local jar = { { name = "jar", canvas = treatJar() } }
local blocks = {
  { name = "block", canvas = stackBlock(false) },
  { name = "block-lit", canvas = stackBlock(true) },
}

save("icons.aseprite", 16, 16, icons)
save("hiding-cup.aseprite", 40, 36, cups)
save("treat-jar.aseprite", 48, 56, jar)
save("stack-block.aseprite", 16, 12, blocks)

for _, f in ipairs(icons) do png(f.name, f.canvas) end
png("hiding-cup", cups[1].canvas)
png("hiding-cup-lit", cups[2].canvas)
png("treat-jar", jar[1].canvas)
-- a 9-slice draws a whole image, so each block is its own file on the web too
for _, f in ipairs(blocks) do
  png("stack-" .. f.name, f.canvas)
  writePng(web .. "/stack-" .. f.name .. ".png", f.canvas)
end
