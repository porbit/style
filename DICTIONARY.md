# CSS Dictionary

## Global Common Values
These abbreviations work with almost all properties (where applicable).

| Abbreviation | Value |
| :--- | :--- |
| `un` | unset |
| `ini` | initial |
| `in` | inherit |
| `n` | none |
| `a` | auto |
| `t` | top |
| `r` | right |
| `b` | bottom |
| `l` | left |
| `c` | center |
| `cc` | currentColor |
| `col` | collapse |
| `das` | dashed |
| `dot` | dotted |
| `dub` | double |
| `e` | end |
| `fitc` | fit-content |
| `h` | hidden |
| `j` | justify |
| `m` | middle |
| `maxc` | max-content |
| `minc` | min-content |
| `rv` | revert |
| `s` | start |
| `sol` | solid |
| `tr` | transparent |
| `vis` | visible |

---

## Property Dictionary

| Abbreviation | Property | Values | Example |
| :--- | :--- | :--- | :--- |
| `a` | **all** | _(raw values)_ | `aUn`<br/>*(all: unset)* |
| `ac` | **align-content** | `s`: start<br/> `e`: end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `n`: normal<br/> `b`: baseline<br/> `fb`: first baseline<br/> `lb`: last baseline<br/> `sp`: space-between<br/> `sa`: space-around<br/> `se`: space-evenly<br/> `st`: stretch<br/> `sc`: safe center<br/> `uc`: unsafe center | `acS`<br/>*(align-content: start)* |
| `acc` | **accent-color** | `u`: unset | `accU`<br/>*(accent-color: unset)* |
| `ai` | **align-items** | `n`: normal<br/> `c`: center<br/> `s`: start<br/> `e`: end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `ss`: self-start<br/> `se`: self-end<br/> `b`: baseline<br/> `fb`: first baseline<br/> `lb`: last baseline<br/> `sc`: safe center<br/> `uc`: unsafe center | `aiN`<br/>*(align-items: normal)* |
| `ani` | **animation** | _(raw values)_ | `aniUn`<br/>*(animation: unset)* |
| `anic` | **animation-composition** | `r`: replace<br/> `a`: add<br/> `ac`: accumulate<br/> `ra`: replace, add<br/> `aac`: add, accumulate<br/> `raac`: replace, add, accumulate | `anicR`<br/>*(animation-composition: replace)* |
| `anide` | **animation-delay** | _(raw values)_ | `anide250ms`<br/>*(animation-delay: 250ms)* |
| `anidi` | **animation-direction** | `r`: reverse<br/> `a`: alternate<br/> `ar`: alternate-reverse<br/> `nr`: normal, reverse<br/> `arn`: alternate, reverse, normal | `anidiR`<br/>*(animation-direction: reverse)* |
| `anidu` | **animation-duration** | _(raw values)_ | `anidu250ms`<br/>*(animation-duration: 250ms)* |
| `anifm` | **animation-fill-mode** | `f`: forwards<br/> `b`: backwards<br/> `nb`: none, backwards<br/> `fbn`: both, forwards, none | `anifmF`<br/>*(animation-fill-mode: forwards)* |
| `aniic` | **animation-iteration-count** | _(raw values)_ | `aniic5`<br/>*(animation-iteration-count: 5)* |
| `anin` | **animation-name** | `s`: slide | `aninS`<br/>*(animation-name: slide)* |
| `anips` | **animation-play-state** | `p`: paused<br/> `r`: running | `anipsP`<br/>*(animation-play-state: paused)* |
| `anitf` | **animation-timing-function** | `ei`: ease-in<br/> `eo`: ease-out<br/> `eio`: ease-in-out<br/> `l`: linear<br/> `ss`: step-start<br/> `se`: step-end | `anitfL`<br/>*(animation-timing-function: linear)* |
| `ap` | **appearance** | `mb`: menulist-button<br/> `tf`: textfield<br/> `b`: button<br/> `c`: checkbox | `apB`<br/>*(appearance: button)* |
| `ar` | **aspect-ratio** | `s`: 1 / 1<br/> `v`: 16 / 9 | `arS`<br/>*(aspect-ratio: 1 / 1)* |
| `as` | **align-self** | `n`: normal<br/> `c`: center<br/> `s`: start<br/> `e`: end<br/> `ss`: self-start<br/> `se`: self-end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `b`: baseline<br/> `fb`: first baseline<br/> `lb`: last baseline<br/> `st`: stretch<br/> `sc`: safe center<br/> `uc`: unsafe center | `asN`<br/>*(align-self: normal)* |
| `b` | **bottom** | _(raw values)_ | `b10px`<br/>*(bottom: 10px)* |
| `bd` | **border** | `d`: dotted<br/> `ds`: dashed<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `i`: inset<br/> `o`: outset | `bdD`<br/>*(border: dotted)* |
| `bda` | **border-radius** | _(raw values)_ | `bda10px`<br/>*(border-radius: 10px)* |
| `bdb` | **border-bottom** | _(raw values)_ | `bdb10px`<br/>*(border-bottom: 10px)* |
| `bdbc` | **border-bottom-color** | _(raw values)_ | `bdbcRed`<br/>*(border-bottom-color: Red)* |
| `bdblc` | **border-block-color** | _(raw values)_ | `bdblcRed`<br/>*(border-block-color: Red)* |
| `bdble` | **border-block-end** | _(raw values)_ | `bdbleUn`<br/>*(border-block-end: unset)* |
| `bdblec` | **border-block-end-color** | _(raw values)_ | `bdblecRed`<br/>*(border-block-end-color: Red)* |
| `bdbles` | **border-block-end-style** | `d`: dotted<br/> `ds`: dashed<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `i`: inset<br/> `o`: outset | `bdblesD`<br/>*(border-block-end-style: dotted)* |
| `bdblew` | **border-block-end-width** | _(raw values)_ | `bdblew10px`<br/>*(border-block-end-width: 10px)* |
| `bdblk` | **border-block** | _(raw values)_ | `bdblkUn`<br/>*(border-block: unset)* |
| `bdblr` | **border-bottom-left-radius** | _(raw values)_ | `bdblr10px`<br/>*(border-bottom-left-radius: 10px)* |
| `bdbls` | **border-block-start** | _(raw values)_ | `bdblsUn`<br/>*(border-block-start: unset)* |
| `bdblsc` | **border-block-start-color** | _(raw values)_ | `bdblscRed`<br/>*(border-block-start-color: Red)* |
| `bdblss` | **border-block-start-style** | `d`: dotted<br/> `ds`: dashed<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `i`: inset<br/> `o`: outset | `bdblssD`<br/>*(border-block-start-style: dotted)* |
| `bdblst` | **border-block-style** | `d`: dotted<br/> `ds`: dashed<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `i`: inset<br/> `o`: outset | `bdblstD`<br/>*(border-block-style: dotted)* |
| `bdblsw` | **border-block-start-width** | _(raw values)_ | `bdblsw10px`<br/>*(border-block-start-width: 10px)* |
| `bdblwi` | **border-block-width** | _(raw values)_ | `bdblwi10px`<br/>*(border-block-width: 10px)* |
| `bdbr` | **box-decoration-break** | `c`: clone<br/> `s`: slice | `bdbrC`<br/>*(box-decoration-break: clone)* |
| `bdbrr` | **border-bottom-right-radius** | _(raw values)_ | `bdbrr10px`<br/>*(border-bottom-right-radius: 10px)* |
| `bdbst` | **border-bottom-style** | `d`: dotted<br/> `ds`: dashed<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `i`: inset<br/> `o`: outset | `bdbstD`<br/>*(border-bottom-style: dotted)* |
| `bdbw` | **border-bottom-width** | `t`: thin<br/> `m`: medium<br/> `th`: thick | `bdbwT`<br/>*(border-bottom-width: thin)* |
| `bdc` | **border-color** | _(raw values)_ | `bdcRed`<br/>*(border-color: Red)* |
| `bdcl` | **border-collapse** | `s`: separate<br/> `c`: collapse | `bdclS`<br/>*(border-collapse: separate)* |
| `bdeer` | **border-end-end-radius** | _(raw values)_ | `bdeer10px`<br/>*(border-end-end-radius: 10px)* |
| `bdesr` | **border-end-start-radius** | _(raw values)_ | `bdesr10px`<br/>*(border-end-start-radius: 10px)* |
| `bdi` | **border-inline** | _(raw values)_ | `bdiUn`<br/>*(border-inline: unset)* |
| `bdic` | **border-inline-color** | _(raw values)_ | `bdicRed`<br/>*(border-inline-color: Red)* |
| `bdie` | **border-inline-end** | _(raw values)_ | `bdieUn`<br/>*(border-inline-end: unset)* |
| `bdiec` | **border-inline-end-color** | _(raw values)_ | `bdiecRed`<br/>*(border-inline-end-color: Red)* |
| `bdies` | **border-inline-end-style** | _(raw values)_ | `bdiesUn`<br/>*(border-inline-end-style: unset)* |
| `bdiew` | **border-inline-end-width** | _(raw values)_ | `bdiew10px`<br/>*(border-inline-end-width: 10px)* |
| `bdimg` | **border-image** | _(raw values)_ | `bdimg[url('...')]`<br/>*(border-image: url('...'))* |
| `bdinw` | **border-inline-width** | _(raw values)_ | `bdinw10px`<br/>*(border-inline-width: 10px)* |
| `bdio` | **border-image-outset** | _(raw values)_ | `bdio[url('...')]`<br/>*(border-image-outset: url('...'))* |
| `bdir` | **border-image-repeat** | `st`: stretch<br/> `r`: repeat<br/> `rn`: round<br/> `s`: space | `bdirR`<br/>*(border-image-repeat: repeat)* |
| `bdis` | **border-image-slice** | _(raw values)_ | `bdis[url('...')]`<br/>*(border-image-slice: url('...'))* |
| `bdisc` | **border-inline-start-color** | _(raw values)_ | `bdiscRed`<br/>*(border-inline-start-color: Red)* |
| `bdisrc` | **border-image-source** | _(raw values)_ | `bdisrc[url('...')]`<br/>*(border-image-source: url('...'))* |
| `bdiss` | **border-inline-start-style** | _(raw values)_ | `bdissUn`<br/>*(border-inline-start-style: unset)* |
| `bdista` | **border-inline-start** | _(raw values)_ | `bdistaUn`<br/>*(border-inline-start: unset)* |
| `bdistl` | **border-inline-style** | _(raw values)_ | `bdistlUn`<br/>*(border-inline-style: unset)* |
| `bdisw` | **border-inline-start-width** | _(raw values)_ | `bdisw10px`<br/>*(border-inline-start-width: 10px)* |
| `bdiw` | **border-image-width** | _(raw values)_ | `bdiw10px`<br/>*(border-image-width: 10px)* |
| `bdl` | **border-left** | _(raw values)_ | `bdl10px`<br/>*(border-left: 10px)* |
| `bdlc` | **border-left-color** | _(raw values)_ | `bdlcRed`<br/>*(border-left-color: Red)* |
| `bdls` | **border-left-style** | _(raw values)_ | `bdls10px`<br/>*(border-left-style: 10px)* |
| `bdlw` | **border-left-width** | `t`: thin<br/> `m`: medium<br/> `th`: thick | `bdlwT`<br/>*(border-left-width: thin)* |
| `bdr` | **border-right** | _(raw values)_ | `bdr10px`<br/>*(border-right: 10px)* |
| `bdra` | **border-radius** | _(raw values)_ | `bdra10px`<br/>*(border-radius: 10px)* |
| `bdrc` | **border-right-color** | _(raw values)_ | `bdrcRed`<br/>*(border-right-color: Red)* |
| `bdrs` | **border-right-style** | `dt`: dotted<br/> `ds`: dashed<br/> `s`: solid<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `in`: inset<br/> `out`: outset | `bdrsS`<br/>*(border-right-style: solid)* |
| `bdrw` | **border-right-width** | `t`: thin<br/> `m`: medium<br/> `th`: thick | `bdrwT`<br/>*(border-right-width: thin)* |
| `bds` | **border-style** | `dt`: dotted<br/> `ds`: dashed<br/> `s`: solid<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `in`: inset<br/> `out`: outset | `bdsS`<br/>*(border-style: solid)* |
| `bdser` | **border-start-end-radius** | _(raw values)_ | `bdser10px`<br/>*(border-start-end-radius: 10px)* |
| `bdsp` | **border-spacing** | _(raw values)_ | `bdsp10px`<br/>*(border-spacing: 10px)* |
| `bdssr` | **border-start-start-radius** | _(raw values)_ | `bdssr10px`<br/>*(border-start-start-radius: 10px)* |
| `bdt` | **border-top** | _(raw values)_ | `bdt10px`<br/>*(border-top: 10px)* |
| `bdtc` | **border-top-color** | _(raw values)_ | `bdtcRed`<br/>*(border-top-color: Red)* |
| `bdtlr` | **border-top-left-radius** | _(raw values)_ | `bdtlr10px`<br/>*(border-top-left-radius: 10px)* |
| `bdtrr` | **border-top-right-radius** | _(raw values)_ | `bdtrr10px`<br/>*(border-top-right-radius: 10px)* |
| `bdts` | **border-top-style** | `dt`: dotted<br/> `ds`: dashed<br/> `s`: solid<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `in`: inset<br/> `out`: outset | `bdtsS`<br/>*(border-top-style: solid)* |
| `bdtw` | **border-top-width** | `t`: thin<br/> `m`: medium<br/> `th`: thick | `bdtwT`<br/>*(border-top-width: thin)* |
| `bdw` | **border-width** | `t`: thin<br/> `m`: medium<br/> `th`: thick | `bdwT`<br/>*(border-width: thin)* |
| `bg` | **background** | _(raw values)_ | `bgRed`<br/>*(background: Red)* |
| `bga` | **background-attachment** | `s`: scroll<br/> `f`: fixed<br/> `l`: local | `bgaS`<br/>*(background-attachment: scroll)* |
| `bgbm` | **background-blend-mode** | `n`: normal<br/> `m`: multiply<br/> `s`: screen<br/> `o`: overlay<br/> `d`: darken<br/> `l`: lighten<br/> `cd`: color-dodge<br/> `i`: color-burn<br/> `hl`: hard-light<br/> `sl`: soft-light<br/> `di`: difference<br/> `e`: exclusion<br/> `h`: hue<br/> `sa`: saturation<br/> `c`: color<br/> `lu`: luminosity | `bgbmN`<br/>*(background-blend-mode: normal)* |
| `bgc` | **background-color** | `t`: transparent<br/> `c`: currentcolor | `bgcT`<br/>*(background-color: transparent)* |
| `bgcl` | **background-clip** | `bb`: border-box<br/> `pb`: padding-box<br/> `cb`: content-box<br/> `t`: text | `bgclT`<br/>*(background-clip: text)* |
| `bgi` | **background-image** | _(raw values)_ | `bgi[url('...')]`<br/>*(background-image: url('...'))* |
| `bgo` | **background-origin** | `bb`: border-box<br/> `pb`: padding-box<br/> `cb`: content-box | `bgoBb`<br/>*(background-origin: border-box)* |
| `bgp` | **background-position** | `t`: top<br/> `b`: bottom<br/> `l`: left<br/> `r`: right<br/> `c`: center<br/> `lt`: left top<br/> `ct`: center top<br/> `rt`: right top<br/> `lc`: left center<br/> `cc`: center center<br/> `rc`: right center<br/> `lb`: left bottom<br/> `cb`: center bottom<br/> `rb`: right bottom | `bgpT`<br/>*(background-position: top)* |
| `bgpx` | **background-position-x** | `l`: left<br/> `r`: right<br/> `c`: center | `bgpxL`<br/>*(background-position-x: left)* |
| `bgpy` | **background-position-y** | `t`: top<br/> `b`: bottom<br/> `c`: center | `bgpyT`<br/>*(background-position-y: top)* |
| `bgr` | **background-repeat** | `r`: repeat<br/> `x`: repeat-x<br/> `y`: repeat-y<br/> `s`: space<br/> `rn`: round<br/> `n`: no-repeat<br/> `rs`: repeat space<br/> `rr`: repeat repeat<br/> `nr`: no-repeat round | `bgrR`<br/>*(background-repeat: repeat)* |
| `bgs` | **background-size** | `c`: contain | `bgsC`<br/>*(background-size: contain)* |
| `bkdf` | **backdrop-filter** | _(raw values)_ | `bkdfUn`<br/>*(backdrop-filter: unset)* |
| `bkfv` | **backface-visibility** | _(raw values)_ | `bkfvUn`<br/>*(backface-visibility: unset)* |
| `blks` | **block-size** | _(raw values)_ | `blks10px`<br/>*(block-size: 10px)* |
| `brka` | **break-after** | _(raw values)_ | `brkaPage`<br/>*(break-after: page)* |
| `brkb` | **break-before** | _(raw values)_ | `brkbPage`<br/>*(break-before: page)* |
| `brki` | **break-inside** | _(raw values)_ | `brkiPage`<br/>*(break-inside: page)* |
| `bxsh` | **box-shadow** | _(raw values)_ | `bxshUn`<br/>*(box-shadow: unset)* |
| `bxshd` | **box-shadow** | _(raw values)_ | `bxshdUn`<br/>*(box-shadow: unset)* |
| `bxsz` | **box-sizing** | _(raw values)_ | `bxszUn`<br/>*(box-sizing: unset)* |
| `c` | **color** | `i`: inherit<br/> `t`: transparent | `cI`<br/>*(color: inherit)* |
| `caps` | **caption-side** | _(raw values)_ | `capsUn`<br/>*(caption-side: unset)* |
| `cip` | **color-interpolation** | _(raw values)_ | `cipRed`<br/>*(color-interpolation: Red)* |
| `ciw` | **contain-intrinsic-width** | _(raw values)_ | `ciw10px`<br/>*(contain-intrinsic-width: 10px)* |
| `clpp` | **clip-path** | _(raw values)_ | `clppUn`<br/>*(clip-path: unset)* |
| `clr` | **clear** | _(raw values)_ | `clrUn`<br/>*(clear: unset)* |
| `cnt` | **contain** | _(raw values)_ | `cntUn`<br/>*(contain: unset)* |
| `cntibs` | **contain-intrinsic-block-size** | _(raw values)_ | `cntibs10px`<br/>*(contain-intrinsic-block-size: 10px)* |
| `cntih` | **contain-intrinsic-height** | _(raw values)_ | `cntih10px`<br/>*(contain-intrinsic-height: 10px)* |
| `cntiis` | **contain-intrinsic-inline-size** | _(raw values)_ | `cntiis10px`<br/>*(contain-intrinsic-inline-size: 10px)* |
| `cntis` | **contain-intrinsic-size** | _(raw values)_ | `cntis10px`<br/>*(contain-intrinsic-size: 10px)* |
| `cntri` | **counter-increment** | _(raw values)_ | `cntri5`<br/>*(counter-increment: 5)* |
| `cntrr` | **counter-reset** | _(raw values)_ | `cntrr5`<br/>*(counter-reset: 5)* |
| `cntrs` | **counter-set** | _(raw values)_ | `cntrs5`<br/>*(counter-set: 5)* |
| `col` | **columns** | _(raw values)_ | `colUn`<br/>*(columns: unset)* |
| `colc` | **column-count** | _(raw values)_ | `colc5`<br/>*(column-count: 5)* |
| `colf` | **column-fill** | _(raw values)_ | `colfRed`<br/>*(column-fill: Red)* |
| `colg` | **column-gap** | _(raw values)_ | `colg10px`<br/>*(column-gap: 10px)* |
| `colr` | **column-rule** | _(raw values)_ | `colrUn`<br/>*(column-rule: unset)* |
| `colrc` | **column-rule-color** | _(raw values)_ | `colrcRed`<br/>*(column-rule-color: Red)* |
| `colrs` | **column-rule-style** | _(raw values)_ | `colrsUn`<br/>*(column-rule-style: unset)* |
| `colrw` | **column-rule-width** | _(raw values)_ | `colrw10px`<br/>*(column-rule-width: 10px)* |
| `cols` | **column-span** | _(raw values)_ | `colsUn`<br/>*(column-span: unset)* |
| `colw` | **column-width** | _(raw values)_ | `colw10px`<br/>*(column-width: 10px)* |
| `cr` | **cursor** | `p`: pointer<br/> `d`: default<br/> `cm`: context-menu<br/> `h`: help<br/> `pg`: progress<br/> `w`: wait<br/> `c`: cell<br/> `t`: text<br/> `vt`: vertical-text<br/> `al`: alias<br/> `cp`: copy<br/> `mo`: move<br/> `nd`: no-drop<br/> `na`: not-allowed<br/> `gr`: grab<br/> `gb`: grabbing<br/> `as`: all-scroll<br/> `colr`: col-resize<br/> `rr`: row-resize<br/> `nr`: n-resize<br/> `er`: e-resize<br/> `sr`: s-resize<br/> `wr`: w-resize<br/> `ner`: ne-resize<br/> `ser`: se-resize<br/> `swr`: sw-resize<br/> `ewr`: ew-resize<br/> `nsr`: ns-resize<br/> `nesw`: nesw-resize<br/> `nwse`: nwse-resize<br/> `zi`: zoom-in<br/> `zo`: zoom-out | `crP`<br/>*(cursor: pointer)* |
| `crtc` | **caret-color** | _(raw values)_ | `crtcRed`<br/>*(caret-color: Red)* |
| `csch` | **color-scheme** | _(raw values)_ | `cschRed`<br/>*(color-scheme: Red)* |
| `ctr` | **container** | _(raw values)_ | `ctrUn`<br/>*(container: unset)* |
| `ctrn` | **container-name** | _(raw values)_ | `ctrnUn`<br/>*(container-name: unset)* |
| `ctrt` | **container-type** | _(raw values)_ | `ctrtUn`<br/>*(container-type: unset)* |
| `ctt` | **content** | _(raw values)_ | `ctt[url('...')]`<br/>*(content: url('...'))* |
| `d` | **display** | `b`: block<br/> `ib`: inline-block<br/> `i`: inline<br/> `f`: flex<br/> `if`: inline-flex<br/> `t`: table<br/> `it`: inline-table<br/> `tcp`: table-caption<br/> `tcell`: table-cell<br/> `tcol`: table-column<br/> `tcolg`: table-column-group<br/> `tfg`: table-footer-group<br/> `thg`: table-header-group<br/> `trg`: table-row-group<br/> `tr`: table-row<br/> `fr`: flow-root<br/> `g`: grid<br/> `ig`: inline-grid<br/> `c`: contents<br/> `li`: list-item | `dB`<br/>*(display: block)* |
| `dir` | **direction** | _(raw values)_ | `dirUn`<br/>*(direction: unset)* |
| `empc` | **empty-cells** | _(raw values)_ | `empcUn`<br/>*(empty-cells: unset)* |
| `fca` | **forced-color-adjust** | _(raw values)_ | `fcaRed`<br/>*(forced-color-adjust: Red)* |
| `ff` | **font-family** | `a`: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'<br/> `s`: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif<br/> `m`: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace | `ffA`<br/>*(font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji')* |
| `fl` | **float** | `is`: inline-start<br/> `ie`: inline-end<br/> `r`: right<br/> `l`: left | `flR`<br/>*(float: right)* |
| `flt` | **filter** | _(raw values)_ | `fltUn`<br/>*(filter: unset)* |
| `fn` | **font** | _(raw values)_ | `fnUn`<br/>*(font: unset)* |
| `fnf` | **font-family** | _(raw values)_ | `fnf[Arial]`<br/>*(font-family: Arial)* |
| `fnfs` | **font-feature-settings** | _(raw values)_ | `fnfsUn`<br/>*(font-feature-settings: unset)* |
| `fnk` | **font-kerning** | _(raw values)_ | `fnkUn`<br/>*(font-kerning: unset)* |
| `fnlo` | **font-language-override** | _(raw values)_ | `fnloUn`<br/>*(font-language-override: unset)* |
| `fnos` | **font-optical-sizing** | _(raw values)_ | `fnosUn`<br/>*(font-optical-sizing: unset)* |
| `fnp` | **font-palette** | _(raw values)_ | `fnpUn`<br/>*(font-palette: unset)* |
| `fns` | **font-size** | _(raw values)_ | `fns10px`<br/>*(font-size: 10px)* |
| `fnsa` | **font-size-adjust** | _(raw values)_ | `fnsa10px`<br/>*(font-size-adjust: 10px)* |
| `fnsp` | **font-synthesis-position** | _(raw values)_ | `fnspUn`<br/>*(font-synthesis-position: unset)* |
| `fnss` | **font-synthesis-style** | _(raw values)_ | `fnssUn`<br/>*(font-synthesis-style: unset)* |
| `fnssc` | **font-synthesis-small-caps** | _(raw values)_ | `fnsscUn`<br/>*(font-synthesis-small-caps: unset)* |
| `fnstr` | **font-stretch** | _(raw values)_ | `fnstrUn`<br/>*(font-stretch: unset)* |
| `fnsty` | **font-style** | _(raw values)_ | `fnstyUn`<br/>*(font-style: unset)* |
| `fnsw` | **font-synthesis-weight** | _(raw values)_ | `fnswUn`<br/>*(font-synthesis-weight: unset)* |
| `fnsyn` | **font-synthesis** | _(raw values)_ | `fnsynUn`<br/>*(font-synthesis: unset)* |
| `fnv` | **font-variant** | _(raw values)_ | `fnvUn`<br/>*(font-variant: unset)* |
| `fnva` | **font-variant-alternates** | _(raw values)_ | `fnvaUn`<br/>*(font-variant-alternates: unset)* |
| `fnvc` | **font-variant-caps** | _(raw values)_ | `fnvcUn`<br/>*(font-variant-caps: unset)* |
| `fnve` | **font-variant-emoji** | _(raw values)_ | `fnveUn`<br/>*(font-variant-emoji: unset)* |
| `fnvea` | **font-variant-east-asian** | _(raw values)_ | `fnveaUn`<br/>*(font-variant-east-asian: unset)* |
| `fnvl` | **font-variant-ligatures** | _(raw values)_ | `fnvlUn`<br/>*(font-variant-ligatures: unset)* |
| `fnvn` | **font-variant-numeric** | _(raw values)_ | `fnvnUn`<br/>*(font-variant-numeric: unset)* |
| `fnvp` | **font-variant-position** | _(raw values)_ | `fnvpUn`<br/>*(font-variant-position: unset)* |
| `fnvs` | **font-variation-settings** | _(raw values)_ | `fnvsUn`<br/>*(font-variation-settings: unset)* |
| `fnw` | **font-weight** | _(raw values)_ | `fnwUn`<br/>*(font-weight: unset)* |
| `fw` | **font-weight** | _(raw values)_ | `fwUn`<br/>*(font-weight: unset)* |
| `fx` | **flex** | `i`: 0 1 auto<br/> `a`: 1 1 auto | `fxI`<br/>*(flex: 0 1 auto)* |
| `fxb` | **flex-basis** | _(raw values)_ | `fxb10px`<br/>*(flex-basis: 10px)* |
| `fxd` | **flex-direction** | `r`: row<br/> `rr`: row-reverse<br/> `c`: column<br/> `cr`: column-reverse | `fxdR`<br/>*(flex-direction: row)* |
| `fxf` | **flex-flow** | _(raw values)_ | `fxfUn`<br/>*(flex-flow: unset)* |
| `fxg` | **flex-grow** | _(raw values)_ | `fxg5`<br/>*(flex-grow: 5)* |
| `fxs` | **flex-shrink** | _(raw values)_ | `fxs5`<br/>*(flex-shrink: 5)* |
| `fxw` | **flex-wrap** | `w`: wrap<br/> `wr`: wrap-reverse<br/> `n`: nowrap | `fxwW`<br/>*(flex-wrap: wrap)* |
| `g` | **grid** | _(raw values)_ | `gUn`<br/>*(grid: unset)* |
| `ga` | **grid-area** | _(raw values)_ | `gaUn`<br/>*(grid-area: unset)* |
| `gac` | **grid-auto-columns** | `mic`: min-content<br/> `mac`: max-content<br/> `mm`: minmax(0, 1fr) | `gacMic`<br/>*(grid-auto-columns: min-content)* |
| `gaf` | **grid-auto-flow** | `r`: row<br/> `c`: column<br/> `d`: dense<br/> `rd`: row dense<br/> `cd`: column dense | `gafR`<br/>*(grid-auto-flow: row)* |
| `gap` | **gap** | _(raw values)_ | `gap10px`<br/>*(gap: 10px)* |
| `gar` | **grid-auto-rows** | `mic`: min-content<br/> `mac`: max-content<br/> `mm`: minmax(0, 1fr) | `garMic`<br/>*(grid-auto-rows: min-content)* |
| `gc` | **grid-column** | `f`: 1 / -1 | `gcF`<br/>*(grid-column: 1 / -1)* |
| `gce` | **grid-column-end** | _(raw values)_ | `gceUn`<br/>*(grid-column-end: unset)* |
| `gcs` | **grid-column-start** | _(raw values)_ | `gcsUn`<br/>*(grid-column-start: unset)* |
| `gr` | **grid-row** | `f`: 1 / -1 | `grF`<br/>*(grid-row: 1 / -1)* |
| `gre` | **grid-row-end** | _(raw values)_ | `greUn`<br/>*(grid-row-end: unset)* |
| `grs` | **grid-row-start** | _(raw values)_ | `grsUn`<br/>*(grid-row-start: unset)* |
| `gt` | **grid-template** | _(raw values)_ | `gtUn`<br/>*(grid-template: unset)* |
| `gta` | **grid-template-areas** | _(raw values)_ | `gtaUn`<br/>*(grid-template-areas: unset)* |
| `gtc` | **grid-template-columns** | `s`: subgrid | `gtcS`<br/>*(grid-template-columns: subgrid)* |
| `gtr` | **grid-template-rows** | `s`: subgrid | `gtrS`<br/>*(grid-template-rows: subgrid)* |
| `h` | **height** | `mic`: min-content<br/> `mac`: max-content<br/> `fc`: fit-content | `hMic`<br/>*(height: min-content)* |
| `hc` | **hyphenate-character** | _(raw values)_ | `hcUn`<br/>*(hyphenate-character: unset)* |
| `hlc` | **hyphenate-limit-chars** | _(raw values)_ | `hlcUn`<br/>*(hyphenate-limit-chars: unset)* |
| `hp` | **hanging-punctuation** | _(raw values)_ | `hpUn`<br/>*(hanging-punctuation: unset)* |
| `hyp` | **hyphens** | `m`: manual | `hypM`<br/>*(hyphens: manual)* |
| `i` | **inset** | _(raw values)_ | `i10px`<br/>*(inset: 10px)* |
| `ibe` | **inset-block-end** | _(raw values)_ | `ibe10px`<br/>*(inset-block-end: 10px)* |
| `iblk` | **inset-block** | _(raw values)_ | `iblk10px`<br/>*(inset-block: 10px)* |
| `ibsta` | **inset-block-start** | _(raw values)_ | `ibsta10px`<br/>*(inset-block-start: 10px)* |
| `ii` | **inset-inline** | _(raw values)_ | `ii10px`<br/>*(inset-inline: 10px)* |
| `iie` | **inset-inline-end** | _(raw values)_ | `iie10px`<br/>*(inset-inline-end: 10px)* |
| `iis` | **inset-inline-start** | _(raw values)_ | `iis10px`<br/>*(inset-inline-start: 10px)* |
| `imgo` | **image-orientation** | _(raw values)_ | `imgo[url('...')]`<br/>*(image-orientation: url('...'))* |
| `imgr` | **image-rendering** | _(raw values)_ | `imgr[url('...')]`<br/>*(image-rendering: url('...'))* |
| `ins` | **inline-size** | _(raw values)_ | `ins10px`<br/>*(inline-size: 10px)* |
| `is` | **isolation** | `i`: isolate | `isI`<br/>*(isolation: isolate)* |
| `jc` | **justify-content** | `c`: center<br/> `s`: start<br/> `e`: end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `l`: left<br/> `r`: right<br/> `n`: normal<br/> `sp`: space-between<br/> `sa`: space-around<br/> `se`: space-evenly<br/> `st`: stretch<br/> `sc`: safe center<br/> `uc`: unsafe center | `jcC`<br/>*(justify-content: center)* |
| `ji` | **justify-items** | `c`: center<br/> `s`: start<br/> `e`: end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `l`: left<br/> `r`: right<br/> `n`: normal<br/> `sp`: space-between<br/> `sa`: space-around<br/> `se`: space-evenly<br/> `st`: stretch<br/> `sc`: safe center<br/> `uc`: unsafe center | `jiC`<br/>*(justify-items: center)* |
| `js` | **justify-self** | `c`: center<br/> `s`: start<br/> `e`: end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `l`: left<br/> `r`: right<br/> `n`: normal<br/> `sp`: space-between<br/> `sa`: space-around<br/> `se`: space-evenly<br/> `st`: stretch<br/> `sc`: safe center<br/> `uc`: unsafe center | `jsC`<br/>*(justify-self: center)* |
| `l` | **left** | _(raw values)_ | `l10px`<br/>*(left: 10px)* |
| `lbrk` | **line-break** | _(raw values)_ | `lbrkUn`<br/>*(line-break: unset)* |
| `lh` | **line-height** | _(raw values)_ | `lh10px`<br/>*(line-height: 10px)* |
| `lisp` | **list-style-position** | `i`: inside<br/> `o`: outside | `lispI`<br/>*(list-style-position: inside)* |
| `ls` | **list-style** | `i`: inside<br/> `di`: disc<br/> `c`: circle<br/> `s`: square<br/> `de`: decimal<br/> `g`: georgian<br/> `tci`: trad-chinese-informal<br/> `k`: kannada | `lsI`<br/>*(list-style: inside)* |
| `lsi` | **list-style-image** | _(raw values)_ | `lsi[url('...')]`<br/>*(list-style-image: url('...'))* |
| `lst` | **list-style-type** | `di`: disc<br/> `c`: circle<br/> `s`: square<br/> `de`: decimal<br/> `g`: georgian<br/> `tci`: trad-chinese-informal<br/> `k`: kannada | `lstC`<br/>*(list-style-type: circle)* |
| `lts` | **letter-spacing** | `n`: normal | `ltsN`<br/>*(letter-spacing: normal)* |
| `m` | **margin** | _(raw values)_ | `m10px`<br/>*(margin: 10px)* |
| `mb` | **margin-bottom** | _(raw values)_ | `mb10px`<br/>*(margin-bottom: 10px)* |
| `mbd` | **mix-blend-mode** | `n`: normal<br/> `m`: multiply<br/> `s`: screen<br/> `o`: overlay<br/> `d`: darken<br/> `l`: lighten<br/> `cd`: color-dodge<br/> `i`: color-burn<br/> `hl`: hard-light<br/> `sl`: soft-light<br/> `di`: difference<br/> `e`: exclusion<br/> `h`: hue<br/> `sa`: saturation<br/> `c`: color<br/> `lu`: luminosity | `mbdN`<br/>*(mix-blend-mode: normal)* |
| `mbe` | **margin-block-end** | _(raw values)_ | `mbe10px`<br/>*(margin-block-end: 10px)* |
| `mblk` | **margin-block** | _(raw values)_ | `mblk10px`<br/>*(margin-block: 10px)* |
| `mbs` | **max-block-size** | _(raw values)_ | `mbs10px`<br/>*(max-block-size: 10px)* |
| `mbsta` | **margin-block-start** | _(raw values)_ | `mbsta10px`<br/>*(margin-block-start: 10px)* |
| `mh` | **max-height** | _(raw values)_ | `mh10px`<br/>*(max-height: 10px)* |
| `mibs` | **min-block-size** | _(raw values)_ | `mibs10px`<br/>*(min-block-size: 10px)* |
| `mie` | **margin-inline-end** | _(raw values)_ | `mie10px`<br/>*(margin-inline-end: 10px)* |
| `mih` | **min-height** | `f`: 100%<br/> `mic`: min-content<br/> `mac`: max-content<br/> `fc`: fit-content | `mihF`<br/>*(min-height: 100%)* |
| `min` | **margin-inline** | _(raw values)_ | `min10px`<br/>*(margin-inline: 10px)* |
| `mis` | **max-inline-size** | _(raw values)_ | `mis10px`<br/>*(max-inline-size: 10px)* |
| `mista` | **margin-inline-start** | _(raw values)_ | `mista10px`<br/>*(margin-inline-start: 10px)* |
| `misz` | **min-inline-size** | _(raw values)_ | `misz10px`<br/>*(min-inline-size: 10px)* |
| `miw` | **min-width** | `f`: 100%<br/> `mic`: min-content<br/> `mac`: max-content<br/> `fc`: fit-content | `miwF`<br/>*(min-width: 100%)* |
| `ml` | **margin-left** | _(raw values)_ | `ml10px`<br/>*(margin-left: 10px)* |
| `mr` | **margin-right** | _(raw values)_ | `mr10px`<br/>*(margin-right: 10px)* |
| `msk` | **mask** | _(raw values)_ | `mskUn`<br/>*(mask: unset)* |
| `mskb` | **mask-border** | _(raw values)_ | `mskbUn`<br/>*(mask-border: unset)* |
| `mskbm` | **mask-border-mode** | _(raw values)_ | `mskbmUn`<br/>*(mask-border-mode: unset)* |
| `mskbo` | **mask-border-outset** | _(raw values)_ | `mskboUn`<br/>*(mask-border-outset: unset)* |
| `mskbr` | **mask-border-repeat** | _(raw values)_ | `mskbrUn`<br/>*(mask-border-repeat: unset)* |
| `mskbs` | **mask-border-slice** | _(raw values)_ | `mskbsUn`<br/>*(mask-border-slice: unset)* |
| `mskbsrc` | **mask-border-source** | _(raw values)_ | `mskbsrcUn`<br/>*(mask-border-source: unset)* |
| `mskbw` | **mask-border-width** | _(raw values)_ | `mskbw10px`<br/>*(mask-border-width: 10px)* |
| `mskc` | **mask-clip** | _(raw values)_ | `mskcUn`<br/>*(mask-clip: unset)* |
| `mskcp` | **mask-composite** | _(raw values)_ | `mskcpUn`<br/>*(mask-composite: unset)* |
| `mski` | **mask-image** | _(raw values)_ | `mski[url('...')]`<br/>*(mask-image: url('...'))* |
| `mskm` | **mask-mode** | _(raw values)_ | `mskmUn`<br/>*(mask-mode: unset)* |
| `msko` | **mask-origin** | _(raw values)_ | `mskoUn`<br/>*(mask-origin: unset)* |
| `mskp` | **mask-position** | _(raw values)_ | `mskpUn`<br/>*(mask-position: unset)* |
| `mskr` | **mask-repeat** | _(raw values)_ | `mskrUn`<br/>*(mask-repeat: unset)* |
| `msks` | **mask-size** | _(raw values)_ | `msks10px`<br/>*(mask-size: 10px)* |
| `mskt` | **mask-type** | _(raw values)_ | `msktUn`<br/>*(mask-type: unset)* |
| `mt` | **margin-top** | _(raw values)_ | `mt10px`<br/>*(margin-top: 10px)* |
| `mtd` | **math-depth** | _(raw values)_ | `mtdUn`<br/>*(math-depth: unset)* |
| `mts` | **math-style** | _(raw values)_ | `mtsUn`<br/>*(math-style: unset)* |
| `mw` | **max-width** | _(raw values)_ | `mw10px`<br/>*(max-width: 10px)* |
| `mxw` | **max-width** | _(raw values)_ | `mxw10px`<br/>*(max-width: 10px)* |
| `of` | **object-fit** | `c`: contain<br/> `cv`: cover<br/> `f`: fill<br/> `sd`: scale-down | `ofC`<br/>*(object-fit: contain)* |
| `ofa` | **offset-anchor** | _(raw values)_ | `ofa10px`<br/>*(offset-anchor: 10px)* |
| `ofd` | **offset-distance** | _(raw values)_ | `ofd10px`<br/>*(offset-distance: 10px)* |
| `ofl` | **overflow** | _(raw values)_ | `oflUn`<br/>*(overflow: unset)* |
| `ofla` | **overflow-anchor** | _(raw values)_ | `oflaUn`<br/>*(overflow-anchor: unset)* |
| `oflb` | **overflow-block** | _(raw values)_ | `oflbUn`<br/>*(overflow-block: unset)* |
| `oflcm` | **overflow-clip-margin** | _(raw values)_ | `oflcm10px`<br/>*(overflow-clip-margin: 10px)* |
| `ofli` | **overflow-inline** | _(raw values)_ | `ofliUn`<br/>*(overflow-inline: unset)* |
| `oflw` | **overflow-wrap** | `c`: clip<br/> `s`: scroll | `oflwC`<br/>*(overflow-wrap: clip)* |
| `oflx` | **overflow-x** | `c`: clip<br/> `s`: scroll | `oflxC`<br/>*(overflow-x: clip)* |
| `ofly` | **overflow-y** | `c`: clip<br/> `s`: scroll | `oflyC`<br/>*(overflow-y: clip)* |
| `ofp` | **offset-path** | _(raw values)_ | `ofp10px`<br/>*(offset-path: 10px)* |
| `ofpo` | **offset-position** | _(raw values)_ | `ofpo10px`<br/>*(offset-position: 10px)* |
| `ofr` | **offset-rotate** | _(raw values)_ | `ofr10px`<br/>*(offset-rotate: 10px)* |
| `ofs` | **offset** | _(raw values)_ | `ofs10px`<br/>*(offset: 10px)* |
| `olc` | **outline-color** | `i`: inherit<br/> `c`: currentColor<br/> `t`: transparent | `olcI`<br/>*(outline-color: inherit)* |
| `oli` | **outline** | _(raw values)_ | `oliUn`<br/>*(outline: unset)* |
| `olo` | **outline-offset** | _(raw values)_ | `olo10px`<br/>*(outline-offset: 10px)* |
| `ols` | **outline-style** | `dt`: dotted<br/> `ds`: dashed<br/> `s`: solid<br/> `db`: double<br/> `g`: groove<br/> `r`: ridge<br/> `in`: inset<br/> `out`: outset | `olsS`<br/>*(outline-style: solid)* |
| `olw` | **outline-width** | `t`: thin<br/> `m`: medium<br/> `th`: thick | `olwT`<br/>*(outline-width: thin)* |
| `op` | **object-position** | `b`: bottom<br/> `c`: center<br/> `l`: left<br/> `r`: right<br/> `t`: top<br/> `lb`: left bottom<br/> `lt`: left top<br/> `rb`: right bottom<br/> `rt`: right top | `opB`<br/>*(object-position: bottom)* |
| `opc` | **opacity** | _(raw values)_ | `opc0.5`<br/>*(opacity: 0.5)* |
| `ord` | **order** | _(raw values)_ | `ord5`<br/>*(order: 5)* |
| `orp` | **orphans** | _(raw values)_ | `orpUn`<br/>*(orphans: unset)* |
| `orsby` | **overscroll-behavior-y** | `c`: contain | `orsbyC`<br/>*(overscroll-behavior-y: contain)* |
| `osrbb` | **overscroll-behavior-block** | `c`: contain | `osrbbC`<br/>*(overscroll-behavior-block: contain)* |
| `osrbh` | **overscroll-behavior** | `c`: contain | `osrbhC`<br/>*(overscroll-behavior: contain)* |
| `osrbi` | **overscroll-behavior-inline** | `c`: contain | `osrbiC`<br/>*(overscroll-behavior-inline: contain)* |
| `osrbx` | **overscroll-behavior-x** | `c`: contain | `osrbxC`<br/>*(overscroll-behavior-x: contain)* |
| `p` | **padding** | _(raw values)_ | `p10px`<br/>*(padding: 10px)* |
| `pb` | **padding-bottom** | _(raw values)_ | `pb10px`<br/>*(padding-bottom: 10px)* |
| `pbe` | **padding-block-end** | _(raw values)_ | `pbe10px`<br/>*(padding-block-end: 10px)* |
| `pblk` | **padding-block** | _(raw values)_ | `pblk10px`<br/>*(padding-block: 10px)* |
| `pbs` | **padding-block-start** | _(raw values)_ | `pbs10px`<br/>*(padding-block-start: 10px)* |
| `pe` | **pointer-events** | _(raw values)_ | `peUn`<br/>*(pointer-events: unset)* |
| `pg` | **page** | _(raw values)_ | `pgUn`<br/>*(page: unset)* |
| `pgba` | **page-break-after** | _(raw values)_ | `pgbaPage`<br/>*(page-break-after: page)* |
| `pgbb` | **page-break-before** | _(raw values)_ | `pgbbPage`<br/>*(page-break-before: page)* |
| `pgbi` | **page-break-inside** | _(raw values)_ | `pgbiPage`<br/>*(page-break-inside: page)* |
| `pi` | **padding-inline** | `c`: center<br/> `s`: start<br/> `e`: end<br/> `fs`: flex-start<br/> `fe`: flex-end<br/> `l`: left<br/> `r`: right<br/> `n`: normal<br/> `sp`: space-between<br/> `sa`: space-around<br/> `se`: space-evenly<br/> `st`: stretch<br/> `sc`: safe center<br/> `uc`: unsafe center | `piC`<br/>*(padding-inline: center)* |
| `pie` | **padding-inline-end** | _(raw values)_ | `pie10px`<br/>*(padding-inline-end: 10px)* |
| `pis` | **padding-inline-start** | _(raw values)_ | `pis10px`<br/>*(padding-inline-start: 10px)* |
| `pl` | **padding-left** | _(raw values)_ | `pl10px`<br/>*(padding-left: 10px)* |
| `plc` | **place-content** | _(raw values)_ | `plc[url('...')]`<br/>*(place-content: url('...'))* |
| `pli` | **place-items** | _(raw values)_ | `pliUn`<br/>*(place-items: unset)* |
| `pls` | **place-self** | _(raw values)_ | `plsUn`<br/>*(place-self: unset)* |
| `pos` | **position** | `s`: static<br/> `f`: fixed<br/> `a`: absolute<br/> `r`: relative<br/> `st`: sticky | `posS`<br/>*(position: static)* |
| `pr` | **padding-right** | _(raw values)_ | `pr10px`<br/>*(padding-right: 10px)* |
| `prca` | **print-color-adjust** | _(raw values)_ | `prcaRed`<br/>*(print-color-adjust: Red)* |
| `pso` | **perspective-origin** | _(raw values)_ | `pso10px`<br/>*(perspective-origin: 10px)* |
| `psp` | **perspective** | _(raw values)_ | `psp10px`<br/>*(perspective: 10px)* |
| `pt` | **padding-top** | _(raw values)_ | `pt10px`<br/>*(padding-top: 10px)* |
| `pto` | **paint-order** | _(raw values)_ | `ptoUn`<br/>*(paint-order: unset)* |
| `qts` | **quotes** | _(raw values)_ | `qtsUn`<br/>*(quotes: unset)* |
| `r` | **right** | _(raw values)_ | `r10px`<br/>*(right: 10px)* |
| `rbp` | **ruby-position** | _(raw values)_ | `rbpUn`<br/>*(ruby-position: unset)* |
| `rgap` | **row-gap** | _(raw values)_ | `rgap10px`<br/>*(row-gap: 10px)* |
| `rot` | **rotate** | _(raw values)_ | `rotUn`<br/>*(rotate: unset)* |
| `rsz` | **resize** | `b`: both<br/> `h`: horizontal<br/> `v`: vertical | `rszB`<br/>*(resize: both)* |
| `s` | **scale** | _(raw values)_ | `sUn`<br/>*(scale: unset)* |
| `sbc` | **scrollbar-color** | _(raw values)_ | `sbcRed`<br/>*(scrollbar-color: Red)* |
| `sbg` | **scrollbar-gutter** | _(raw values)_ | `sbgUn`<br/>*(scrollbar-gutter: unset)* |
| `sbw` | **scrollbar-width** | _(raw values)_ | `sbw10px`<br/>*(scrollbar-width: 10px)* |
| `scrb` | **scroll-behavior** | _(raw values)_ | `scrbUn`<br/>*(scroll-behavior: unset)* |
| `scrm` | **scroll-margin** | _(raw values)_ | `scrm10px`<br/>*(scroll-margin: 10px)* |
| `scrmb` | **scroll-margin-bottom** | _(raw values)_ | `scrmb10px`<br/>*(scroll-margin-bottom: 10px)* |
| `scrmbe` | **scroll-margin-block-end** | _(raw values)_ | `scrmbe10px`<br/>*(scroll-margin-block-end: 10px)* |
| `scrmblk` | **scroll-margin-block** | _(raw values)_ | `scrmblk10px`<br/>*(scroll-margin-block: 10px)* |
| `scrmbs` | **scroll-margin-block-start** | _(raw values)_ | `scrmbs10px`<br/>*(scroll-margin-block-start: 10px)* |
| `scrmi` | **scroll-margin-inline** | _(raw values)_ | `scrmi10px`<br/>*(scroll-margin-inline: 10px)* |
| `scrmie` | **scroll-margin-inline-end** | _(raw values)_ | `scrmie10px`<br/>*(scroll-margin-inline-end: 10px)* |
| `scrmis` | **scroll-margin-inline-start** | _(raw values)_ | `scrmis10px`<br/>*(scroll-margin-inline-start: 10px)* |
| `scrml` | **scroll-margin-left** | _(raw values)_ | `scrml10px`<br/>*(scroll-margin-left: 10px)* |
| `scrmr` | **scroll-margin-right** | _(raw values)_ | `scrmr10px`<br/>*(scroll-margin-right: 10px)* |
| `scrmt` | **scroll-margin-top** | _(raw values)_ | `scrmt10px`<br/>*(scroll-margin-top: 10px)* |
| `scrp` | **scroll-padding** | _(raw values)_ | `scrp10px`<br/>*(scroll-padding: 10px)* |
| `scrpb` | **scroll-padding-bottom** | _(raw values)_ | `scrpb10px`<br/>*(scroll-padding-bottom: 10px)* |
| `scrpblk` | **scroll-padding-block** | _(raw values)_ | `scrpblk10px`<br/>*(scroll-padding-block: 10px)* |
| `scrpbs` | **scroll-padding-block-start** | _(raw values)_ | `scrpbs10px`<br/>*(scroll-padding-block-start: 10px)* |
| `scrpi` | **scroll-padding-inline** | _(raw values)_ | `scrpi10px`<br/>*(scroll-padding-inline: 10px)* |
| `scrpie` | **scroll-padding-inline-end** | _(raw values)_ | `scrpie10px`<br/>*(scroll-padding-inline-end: 10px)* |
| `scrpis` | **scroll-padding-inline-start** | _(raw values)_ | `scrpis10px`<br/>*(scroll-padding-inline-start: 10px)* |
| `scrpl` | **scroll-padding-left** | _(raw values)_ | `scrpl10px`<br/>*(scroll-padding-left: 10px)* |
| `scrpr` | **scroll-padding-right** | _(raw values)_ | `scrpr10px`<br/>*(scroll-padding-right: 10px)* |
| `scrpt` | **scroll-padding-top** | _(raw values)_ | `scrpt10px`<br/>*(scroll-padding-top: 10px)* |
| `scrsa` | **scroll-snap-align** | _(raw values)_ | `scrsaUn`<br/>*(scroll-snap-align: unset)* |
| `scrss` | **scroll-snap-stop** | _(raw values)_ | `scrss10px`<br/>*(scroll-snap-stop: 10px)* |
| `scrst` | **scroll-snap-type** | _(raw values)_ | `scrstUn`<br/>*(scroll-snap-type: unset)* |
| `shit` | **shape-image-threshold** | _(raw values)_ | `shit[url('...')]`<br/>*(shape-image-threshold: url('...'))* |
| `shm` | **shape-margin** | _(raw values)_ | `shm10px`<br/>*(shape-margin: 10px)* |
| `sho` | **shape-outside** | _(raw values)_ | `shoUn`<br/>*(shape-outside: unset)* |
| `srcpbe` | **scroll-padding-block-end** | _(raw values)_ | `srcpbe10px`<br/>*(scroll-padding-block-end: 10px)* |
| `t` | **top** | _(raw values)_ | `t10px`<br/>*(top: 10px)* |
| `ta` | **text-align** | `s`: start<br/> `e`: end<br/> `l`: left<br/> `r`: right<br/> `c`: center<br/> `j`: justify<br/> `mp`: match-parent<br/> `mc`: -moz-center<br/> `wc`: -webkit-center | `taS`<br/>*(text-align: start)* |
| `tal` | **text-align-last** | `s`: start<br/> `e`: end<br/> `l`: left<br/> `r`: right<br/> `c`: center<br/> `j`: justify | `talS`<br/>*(text-align-last: start)* |
| `tbl` | **table-layout** | _(raw values)_ | `tblUn`<br/>*(table-layout: unset)* |
| `tbs` | **tab-size** | _(raw values)_ | `tbs10px`<br/>*(tab-size: 10px)* |
| `tcu` | **text-combine-upright** | _(raw values)_ | `tcu10px`<br/>*(text-combine-upright: 10px)* |
| `td` | **text-decoration** | `u`: underline | `tdU`<br/>*(text-decoration: underline)* |
| `tdc` | **text-decoration-color** | _(raw values)_ | `tdcRed`<br/>*(text-decoration-color: Red)* |
| `tdl` | **text-decoration-line** | `u`: underline<br/> `o`: overline<br/> `lt`: line-through<br/> `b`: blink | `tdlU`<br/>*(text-decoration-line: underline)* |
| `tds` | **text-decoration-style** | `db`: double<br/> `dt`: dotted<br/> `ds`: dashed<br/> `w`: wavy | `tdsW`<br/>*(text-decoration-style: wavy)* |
| `tdsi` | **text-decoration-skip-ink** | _(raw values)_ | `tdsiUn`<br/>*(text-decoration-skip-ink: unset)* |
| `tdt` | **text-decoration-thickness** | `ff`: from-font | `tdtFf`<br/>*(text-decoration-thickness: from-font)* |
| `tec` | **text-emphasis-color** | _(raw values)_ | `tecRed`<br/>*(text-emphasis-color: Red)* |
| `tep` | **text-emphasis-position** | `or`: over right<br/> `ol`: over left<br/> `ur`: under right<br/> `ul`: under left<br/> `lo`: left over<br/> `ru`: right under<br/> `lu`: left under | `tepOr`<br/>*(text-emphasis-position: over right)* |
| `teph` | **text-emphasis** | _(raw values)_ | `tephUn`<br/>*(text-emphasis: unset)* |
| `tes` | **text-emphasis-style** | _(raw values)_ | `tesUn`<br/>*(text-emphasis-style: unset)* |
| `ti` | **text-indent** | _(raw values)_ | `tiUn`<br/>*(text-indent: unset)* |
| `tj` | **text-justify** | `iw`: inter-word<br/> `ic`: inter-character<br/> `d`: distribute | `tjD`<br/>*(text-justify: distribute)* |
| `toa` | **touch-action** | `p`: pan-x<br/> `py`: pan-y<br/> `pm`: pan-x pan-y<br/> `pi`: pinch-zoom | `toaP`<br/>*(touch-action: pan-x)* |
| `tol` | **text-overflow** | `c`: clip<br/> `e`: ellipsis | `tolC`<br/>*(text-overflow: clip)* |
| `tor` | **text-orientation** | `m`: mixed<br/> `u`: upright<br/> `sr`: sideways-right<br/> `sl`: sideways-left<br/> `s`: sideways<br/> `ugo`: use-glyph-orientation | `torM`<br/>*(text-orientation: mixed)* |
| `tra` | **transform** | _(raw values)_ | `traUn`<br/>*(transform: unset)* |
| `trab` | **transform-box** | _(raw values)_ | `trabUn`<br/>*(transform-box: unset)* |
| `tran` | **transition** | _(raw values)_ | `tranUn`<br/>*(transition: unset)* |
| `tranb` | **transition-behavior** | _(raw values)_ | `tranbUn`<br/>*(transition-behavior: unset)* |
| `trand` | **transition-delay** | _(raw values)_ | `trand250ms`<br/>*(transition-delay: 250ms)* |
| `trandur` | **transition-duration** | _(raw values)_ | `trandur250ms`<br/>*(transition-duration: 250ms)* |
| `tranp` | **transition-property** | _(raw values)_ | `tranpUn`<br/>*(transition-property: unset)* |
| `trantf` | **transition-timing-function** | _(raw values)_ | `trantfUn`<br/>*(transition-timing-function: unset)* |
| `trao` | **transform-origin** | _(raw values)_ | `traoUn`<br/>*(transform-origin: unset)* |
| `tras` | **transform-style** | _(raw values)_ | `trasUn`<br/>*(transform-style: unset)* |
| `trd` | **text-rendering** | `op`: optimizeSpeed<br/> `ol`: optimizeLegibility<br/> `g`: geometricPrecision | `trdG`<br/>*(text-rendering: geometricPrecision)* |
| `trl` | **translate** | _(raw values)_ | `trl10px`<br/>*(translate: 10px)* |
| `tsh` | **text-shadow** | _(raw values)_ | `tshUn`<br/>*(text-shadow: unset)* |
| `ttr` | **text-transform** | `c`: capitalize<br/> `u`: uppercase<br/> `l`: lowercase<br/> `fw`: full-width<br/> `fsk`: full-size-kana | `ttrC`<br/>*(text-transform: capitalize)* |
| `tuo` | **text-underline-offset** | _(raw values)_ | `tuo10px`<br/>*(text-underline-offset: 10px)* |
| `tup` | **text-underline-position** | `u`: under<br/> `l`: left<br/> `r`: right<br/> `ul`: under left<br/> `ru`: right under | `tupU`<br/>*(text-underline-position: under)* |
| `tw` | **text-wrap** | `w`: wrap<br/> `n`: nowrap<br/> `b`: balance<br/> `p`: pretty | `twW`<br/>*(text-wrap: wrap)* |
| `unib` | **unicode-bidi** | _(raw values)_ | `unibUn`<br/>*(unicode-bidi: unset)* |
| `us` | **user-select** | `t`: text<br/> `all`: all<br/> `c`: contain | `usT`<br/>*(user-select: text)* |
| `v` | **visibility** | `c`: collapse | `vC`<br/>*(visibility: collapse)* |
| `va` | **vertical-align** | `bl`: baseline<br/> `t`: top<br/> `m`: middle<br/> `b`: bottom<br/> `tt`: text-top<br/> `tb`: text-bottom<br/> `sb`: sub<br/> `sp`: super | `vaT`<br/>*(vertical-align: top)* |
| `w` | **width** | `mic`: min-content<br/> `mac`: max-content<br/> `fc`: fit-content<br/> `f`: 100% | `wF`<br/>*(width: 100%)* |
| `wc` | **will-change** | `sp`: scroll-position<br/> `c`: contents<br/> `t`: transform | `wcC`<br/>*(will-change: contents)* |
| `wd` | **widows** | _(raw values)_ | `wdUn`<br/>*(widows: unset)* |
| `wlc` | **-webkit-line-clamp** | _(raw values)_ | `wlcUn`<br/>*(-webkit-line-clamp: unset)* |
| `wrb` | **word-break** | _(raw values)_ | `wrbUn`<br/>*(word-break: unset)* |
| `wrs` | **word-spacing** | _(raw values)_ | `wrs10px`<br/>*(word-spacing: 10px)* |
| `wrtm` | **writing-mode** | _(raw values)_ | `wrtmUn`<br/>*(writing-mode: unset)* |
| `ws` | **white-space** | _(raw values)_ | `wsUn`<br/>*(white-space: unset)* |
| `wsc` | **white-space-collapse** | _(raw values)_ | `wscUn`<br/>*(white-space-collapse: unset)* |
| `wtfc` | **-webkit-text-fill-color** | _(raw values)_ | `wtfcRed`<br/>*(-webkit-text-fill-color: Red)* |
| `wts` | **-webkit-text-stroke** | _(raw values)_ | `wtsRed`<br/>*(-webkit-text-stroke: Red)* |
| `wtsc` | **-webkit-text-stroke-color** | _(raw values)_ | `wtscRed`<br/>*(-webkit-text-stroke-color: Red)* |
| `wtsw` | **-webkit-text-stroke-width** | `m`: medium<br/> `t`: thick | `wtswM`<br/>*(-webkit-text-stroke-width: medium)* |
| `z` | **z-index** | _(raw values)_ | `z5`<br/>*(z-index: 5)* |
| `zo` | **zoom** | _(raw values)_ | `zo5`<br/>*(zoom: 5)* |
