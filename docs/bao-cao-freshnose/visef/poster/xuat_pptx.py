# Xuất poster sang PowerPoint chỉnh sửa được: trích vị trí, chữ, màu, hình từ chính bản HTML (Chrome), rồi dựng bằng python-pptx.
# Tỉ lệ 1:2 (tấm giữa 60×75 cm, tấm bên 30×60 cm, chữ chia đôi) vì PowerPoint giới hạn khổ slide ~142 cm; in phóng 200 %.
# Mỗi mục ①–⑨, dải tên dự án, chân trang là một NHÓM (group) riêng; file "tung-khoi" có mỗi khối một slide.
# Chạy: python -X utf8 dung_poster.py && python -X utf8 xuat_pptx.py
import html as H, json, os, re, subprocess
from urllib.parse import unquote
from pptx import Presentation
from pptx.util import Cm, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "pptx"); os.makedirs(OUT, exist_ok=True)
ICO = os.path.join(OUT, "_icons"); os.makedirs(ICO, exist_ok=True)
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PX = 37.7953          # px trên 1 cm (CSS 96 dpi)
S = 0.5               # tỉ lệ 1:2
FONT = "Roboto"

JS = r"""
<script>
addEventListener('load',()=>{
const PX=37.7953, items=[], secs={};
const rgb=s=>{const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
const hex=c=>'#'+[c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const R=e=>{const b=e.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height}};
const secOf=e=>{const s=e.closest('[data-sec],.sec'); return s?(s.dataset.sec||s.id):'chung'};
document.querySelectorAll('[data-sec],.sec').forEach(s=>{secs[s.dataset.sec||s.id]=R(s)});
const INL=new Set(['SPAN','B','STRONG','I','EM','SUB','SUP','SMALL','BR']);
const SPEC=c=>c.classList&&(c.classList.contains('n')||c.classList.contains('chip')||c.classList.contains('dot'));
const inlineOK=c=>c.nodeType===3||(c.nodeType===1&&INL.has(c.tagName)&&!SPEC(c)&&[...c.childNodes].every(inlineOK));
const isTB=e=>e.textContent.trim()!==''&&[...e.childNodes].every(inlineOK);
function style(n,par){const c=getComputedStyle(n);let t=c.textTransform==='uppercase';return {b:parseInt(c.fontWeight)>=600,c:hex(rgb(c.color)||{r:0,g:0,b:0}),s:parseFloat(c.fontSize)*0.75,sub:n.tagName==='SUB'||c.verticalAlign==='sub',i:c.fontStyle==='italic',up:t||(par&&par.up)};}
function runsOf(e){const runs=[];(function rec(n,st){
 if(n.nodeType===3){let t=n.textContent.replace(/\s+/g,' ');if(st.up)t=t.toUpperCase();if(t)runs.push({t,b:st.b,c:st.c,s:st.s,sub:st.sub,i:st.i});}
 else if(n.nodeType===1){if(n.tagName==='BR'){runs.push({t:'\n',b:st.b,c:st.c,s:st.s});return;}const ns=n===e?st:style(n,st);const blk=n!==e&&getComputedStyle(n).display==='block';if(blk&&runs.length&&runs[runs.length-1].t!=='\n')runs.push({t:'\n',b:st.b,c:st.c,s:st.s});n.childNodes.forEach(k=>rec(k,ns));if(blk)runs.push({t:'\n',b:st.b,c:st.c,s:st.s});}})(e,style(e,null));
 while(runs.length&&runs[runs.length-1].t==='\n')runs.pop();
 if(runs.length){runs[0].t=runs[0].t.replace(/^\s+/,'');runs[runs.length-1].t=runs[runs.length-1].t.replace(/\s+$/,'');}return runs.filter(r=>r.t!=='');}
function emitText(e){const c=getComputedStyle(e),r=R(e);
 const pl=parseFloat(c.paddingLeft),pr=parseFloat(c.paddingRight),pt=parseFloat(c.paddingTop),pb=parseFloat(c.paddingBottom);
 const fs=parseFloat(c.fontSize);let lh=parseFloat(c.lineHeight);if(isNaN(lh))lh=fs*1.2;
 let x=r.x+pl,y=r.y+pt,w=r.w-pl-pr,h=r.h-pt-pb,al=c.textAlign;
 if(c.display.includes('flex')){const rg=document.createRange();rg.selectNodeContents(e);const b=rg.getBoundingClientRect();x=b.left+scrollX;y=b.top+scrollY;w=b.width;h=b.height;al='center';}
 items.push({k:'text',sec:secOf(e),x,y,w,h,al,lh:lh*0.75,runs:runsOf(e)});}
function emitBox(e){const c=getComputedStyle(e),r=R(e);if(r.w<1||r.h<1)return;
 const bg=rgb(c.backgroundColor);const bw=['Top','Right','Bottom','Left'].map(s=>parseFloat(c['border'+s+'Width'])*(c['border'+s+'Style']==='none'?0:1));
 const bc=['Top','Right','Bottom','Left'].map(s=>hex(rgb(c['border'+s+'Color'])||{r:0,g:0,b:0}));
 const rad=c.borderTopLeftRadius,isPct=rad.includes('%');const rpx=parseFloat(rad)||0;
 const uni=bw.every(w=>w>0&&w===bw[0]);
 const grad=/linear-gradient/.test(c.backgroundImage);if((bg&&bg.a>0.01)||uni||grad){items.push({k:'box',sec:secOf(e),x:r.x,y:r.y,w:r.w,h:r.h,fill:grad?'0E6B47':(bg&&bg.a>0.01?hex(bg):null),line:uni?bc[0]:null,lw:uni?bw[0]*0.75:0,rad:rpx,pct:isPct&&rpx>=49});}
 if(!uni){bw.forEach((w,i)=>{if(w>0){const t=[[r.x,r.y,r.w,w],[r.x+r.w-w,r.y,w,r.h],[r.x,r.y+r.h-w,r.w,w],[r.x,r.y,w,r.h]][i];items.push({k:'box',sec:secOf(e),x:t[0],y:t[1],w:t[2],h:t[3],fill:bc[i],line:null,lw:0,rad:0,pct:false});}});}}
let svgN=0;
function walk(e){const tag=e.tagName;if(['SCRIPT','STYLE','HEAD'].includes(tag))return;
 if(tag==='IMG'){const r=R(e),p=e.parentElement,pc=getComputedStyle(p);items.push({k:'img',sec:secOf(e),x:r.x,y:r.y,w:r.w,h:r.h,src:e.src,oval:pc.overflow==='hidden'&&pc.borderTopLeftRadius.includes('%')});return;}
 if(tag==='svg'||tag==='SVG'){const r=R(e),c=getComputedStyle(e);items.push({k:'svg',sec:secOf(e),x:r.x,y:r.y,w:r.w,h:r.h,id:'svg'+(svgN++),html:e.outerHTML,stroke:hex(rgb(getComputedStyle(e).stroke)||rgb(getComputedStyle(e.querySelector('path,circle,rect')||e).stroke)||{r:255,g:255,b:255})});return;}
 emitBox(e);
 if(isTB(e)){emitText(e);return;}
 e.childNodes.forEach(n=>{if(n.nodeType===1)walk(n);else if(n.nodeType===3&&n.textContent.trim()){const rg=document.createRange();rg.selectNodeContents(n);const b=rg.getBoundingClientRect(),c=getComputedStyle(e);let lh=parseFloat(c.lineHeight);if(isNaN(lh))lh=parseFloat(c.fontSize)*1.2;items.push({k:'text',sec:secOf(e),x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height,al:'left',lh:lh*0.75,runs:[{t:n.textContent.replace(/\s+/g,' ').trim(),b:parseInt(c.fontWeight)>=600,c:hex(rgb(c.color)),s:parseFloat(c.fontSize)*0.75}]});}});}
walk(document.body);
document.body.setAttribute('data-pp',JSON.stringify({items,secs,W:document.body.getBoundingClientRect().width,H:document.body.getBoundingClientRect().height}));
});
</script>
"""

rgbc = lambda h: RGBColor.from_string(h.lstrip("#").upper())


def extract(name):
    src = open(os.path.join(HERE, f"{name}.html"), encoding="utf8").read()
    tmp = os.path.join(HERE, f"_pp_{name}.html")
    open(tmp, "w", encoding="utf8").write(src.replace("</body>", JS + "</body>"))
    W = int(re.search(r"width:([\d.]+)cm;height:([\d.]+)cm", src.split("html,body{")[1]).group(1).split(".")[0]) if False else None
    dom = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--dump-dom", "--virtual-time-budget=4000", "--window-size=4600,5700", "file:///" + tmp.replace("\\", "/")],
                         capture_output=True, text=True, encoding="utf8").stdout
    os.remove(tmp)
    m = re.search(r"data-pp=(\"|')(.*?)\1[ >]", dom, flags=re.S)
    return json.loads(H.unescape(m.group(2)))


def render_svg(it):
    path = os.path.join(ICO, it["id"] + ".png")
    px = 240
    page = f'<html><body style="margin:0;background:transparent"><div style="width:{px}px;height:{px}px">{it["html"].replace("<svg ", "<svg style=\"width:%dpx;height:%dpx;fill:none;stroke:%s;stroke-width:3;stroke-linecap:round;stroke-linejoin:round\" " % (px, px, it["stroke"]), 1)}</div></body></html>'
    tmp = os.path.join(ICO, it["id"] + ".html"); open(tmp, "w", encoding="utf8").write(page)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--default-background-color=00000000", f"--screenshot={path}", f"--window-size={px},{px}", "file:///" + tmp.replace("\\", "/")], capture_output=True)
    return path


ALIGN = {"left": PP_ALIGN.LEFT, "start": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "end": PP_ALIGN.RIGHT, "justify": PP_ALIGN.JUSTIFY}


def cm(px):
    return Cm(px / PX * S)


def add_items(shapes, items, dx=0, dy=0):
    for it in items:
        x, y, w, h = it["x"] - dx, it["y"] - dy, it["w"], it["h"]
        if it["k"] == "box":
            kind = MSO_SHAPE.OVAL if it["pct"] else (MSO_SHAPE.ROUNDED_RECTANGLE if it["rad"] > 1 else MSO_SHAPE.RECTANGLE)
            sp = shapes.add_shape(kind, cm(x), cm(y), cm(w), cm(h))
            if kind == MSO_SHAPE.ROUNDED_RECTANGLE:
                sp.adjustments[0] = min(0.5, it["rad"] / max(1, min(w, h)))
            if it["fill"]: sp.fill.solid(); sp.fill.fore_color.rgb = rgbc(it["fill"])
            else: sp.fill.background()
            if it["line"]: sp.line.color.rgb = rgbc(it["line"]); sp.line.width = Pt(it["lw"] * S)
            else: sp.line.fill.background()
            sp.shadow.inherit = False
        elif it["k"] == "img":
            path = unquote(it["src"].replace("file:///", ""))
            pic = shapes.add_picture(path, cm(x), cm(y), cm(w), cm(h))
            if it["oval"]: pic.auto_shape_type = MSO_SHAPE.OVAL
        elif it["k"] == "svg":
            shapes.add_picture(render_svg(it), cm(x), cm(y), cm(w), cm(h))
        elif it["k"] == "text":
            al = ALIGN.get(it["al"], PP_ALIGN.LEFT)
            if al == PP_ALIGN.CENTER:
                extra = w * 0.16 + 6; x -= extra / 2; wid = w + extra
            elif al == PP_ALIGN.RIGHT:
                extra = w * 0.1 + 4; x -= extra; wid = w + extra
            else:
                wid = w * 1.04 + 4      # chừa chút để không tự xuống dòng khi PowerPoint đo chữ khác Chrome
            tb = shapes.add_textbox(cm(x), cm(y), cm(wid), cm(h))
            tf = tb.text_frame; tf.word_wrap = True; tf.auto_size = MSO_AUTO_SIZE.NONE
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.TOP
            par = tf.paragraphs[0]; par.alignment = al; par.line_spacing = Pt(it["lh"] * S)
            for r in it["runs"]:
                if r["t"] == "\n":
                    par = tf.add_paragraph(); par.alignment = al; par.line_spacing = Pt(it["lh"] * S); continue
                run = par.add_run(); run.text = r["t"]
                f = run.font; f.name = FONT; f.size = Pt(round(r["s"] * S * 2) / 2); f.bold = bool(r["b"]); f.italic = bool(r.get("i")); f.color.rgb = rgbc(r["c"])
                if r.get("sub"):
                    run._r.get_or_add_rPr().set("baseline", "-25000")


def build_panel(name, label):
    d = extract(name)
    prs = Presentation()
    prs.slide_width, prs.slide_height = cm(d["W"]), cm(d["H"])
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    groups = {}
    order = []
    for it in d["items"]:
        groups.setdefault(it["sec"], []).append(it)
        if it["sec"] not in order: order.append(it["sec"])
    names = {"b1": "① Lý do chọn đề tài", "b2": "② Thực trạng, khoảng trống", "b3": "③ Câu hỏi nghiên cứu", "b4": "④ Phương pháp", "b5": "⑤ Quy trình", "b6": "⑥ Sơ đồ cấu tạo",
             "b7": "⑦ Nguyên lý hoạt động", "b8": "⑧ Kết quả", "b9": "⑨ Hạn chế, hướng phát triển", "title": "Tên dự án", "foot": "Chân trang", "chung": "Khác"}
    for sid in order:
        grp = slide.shapes.add_group_shape(); grp.name = names.get(sid, sid)
        add_items(grp.shapes, groups[sid])
    f = os.path.join(OUT, f"poster_{name}.pptx"); prs.save(f)
    return d, f


def build_blocks(datas):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Cm(60), Cm(42)
    names = {"b1": "① Lý do chọn đề tài", "b2": "② Thực trạng, khoảng trống", "b3": "③ Câu hỏi nghiên cứu", "b4": "④ Phương pháp", "b5": "⑤ Quy trình", "b6": "⑥ Sơ đồ cấu tạo",
             "b7": "⑦ Nguyên lý hoạt động", "b8": "⑧ Kết quả", "b9": "⑨ Hạn chế, hướng phát triển", "title": "Tên dự án", "foot": "Chân trang"}
    for sid in ["title", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"]:
        for d in datas:
            its = [i for i in d["items"] if i["sec"] == sid]
            if not its: continue
            box = d["secs"][sid]
            sl = prs.slides.add_slide(prs.slide_layouts[6])
            add_items(sl.shapes, its, dx=box["x"], dy=box["y"])
            tb = sl.shapes.add_textbox(Cm(0.4), Cm(41.0), Cm(30), Cm(0.8)); tb.text_frame.text = names[sid] + " (tỉ lệ 1:2; in phóng 200 %)"
            tb.text_frame.paragraphs[0].runs[0].font.size = Pt(11); tb.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(0x8A, 0x8A, 0x8A)
    f = os.path.join(OUT, "poster_tung-khoi.pptx"); prs.save(f)
    return f


datas = []
for n, lab in (("tam-trai", "Tấm trái"), ("tam-giua", "Tấm giữa"), ("tam-phai", "Tấm phải")):
    d, f = build_panel(n, lab); datas.append(d); print("da xuat", f, f"{d['W'] / PX * S:.0f}x{d['H'] / PX * S:.0f} cm", len(d["items"]), "doi tuong")
print("da xuat", build_blocks(datas))
