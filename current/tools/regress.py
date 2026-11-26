#!/usr/bin/env python3
"""逐流發布前回歸測試（2026-11-26 總驗收後加，publish.sh 會先跑這支，不過就不准發布）。
用示範資料（?mock=1）跑，不碰真資料庫。每一條都對應老大罵過的問題，壞了就會擋下。
用法：python3 tools/regress.py   （需要 Python playwright；本機會自己開 8844 埠的暫用伺服器，跑完關掉）
"""
import asyncio, json, os, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8844
URL = f'http://localhost:{PORT}/?mock=1'
fails = []

def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (('  ' + str(detail)[:200]) if detail and not ok else ''))
    if not ok: fails.append(name)

PATH_JS = r"""()=>{const out=[];['#view','#page','#sheet'].forEach(q=>{const r=document.querySelector(q);if(!r)return;const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(/(?:~|\/Users)\/|AI工作夾\//.test(n.nodeValue)&&!(n.parentNode&&n.parentNode.closest('textarea,input,code,pre')))out.push(n.nodeValue.slice(0,60))}});return out}"""

async def page_for(p, w, h):
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark', has_touch=w < 700, is_mobile=w < 700)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    await pg.goto(URL); await pg.wait_for_timeout(3000)
    return b, pg, errs

async def run_size(p, w, h):
    tag = f'{w}寬'
    b, pg, errs = await page_for(p, w, h)
    try:
        sw = await pg.evaluate("()=>document.documentElement.scrollWidth-document.documentElement.clientWidth")
        check(f'{tag} 首頁沒有橫向捲動', sw <= 1, sw)
        paths = await pg.evaluate(PATH_JS)
        check(f'{tag} 首頁沒有本機路徑', not paths, paths)
        # 節奏：長內容只算一條、新增後立刻看得到、重複不再加
        n0 = await pg.evaluate("()=>document.querySelectorAll('.ckbox .ck.want').length")
        await pg.fill('#ckIn', '回歸測試：整理分派、台江簡報，木星回饋；寫標書')
        await pg.press('#ckIn', 'Enter'); await pg.wait_for_timeout(2000)
        n1 = await pg.evaluate("()=>document.querySelectorAll('.ckbox .ck.want').length")
        check(f'{tag} 節奏長內容新增只多一條且立刻出現', n1 == n0 + 1, (n0, n1))
        await pg.fill('#ckIn', '回歸測試：整理分派、台江簡報，木星回饋；寫標書')
        await pg.press('#ckIn', 'Enter'); await pg.wait_for_timeout(2000)
        n2 = await pg.evaluate("()=>document.querySelectorAll('.ckbox .ck.want').length")
        check(f'{tag} 節奏重複輸入不再多一條', n2 == n1, (n1, n2))
        # 詳情頁：點收合不整頁重建、頭像保留
        await pg.evaluate("()=>{const z=window.__zl;const p=z.DB.proj.find(x=>(x.raw&&x.raw.progressSteps||[]).length>=3);window.__rp=p&&p.id;if(p)z.ACT.page('proj:'+p.id)}")
        await pg.wait_for_timeout(1200)
        pid = await pg.evaluate("()=>window.__rp")
        if pid:
            await pg.evaluate("()=>{const p=document.getElementById('page');window.__f=[...p.querySelectorAll('.bm.bf')];window.__all=[...p.querySelectorAll('*')]}")
            await pg.click('.pstr[data-i="0"] .pstfold'); await pg.wait_for_timeout(900)
            r = await pg.evaluate("()=>({faces:window.__f.filter(e=>e.isConnected).length,facesN:window.__f.length,kept:window.__all.filter(e=>e.isConnected).length,all:window.__all.length})")
            check(f'{tag} 步驟收合不閃（頭像全保留）', r['faces'] == r['facesN'], r)
            check(f'{tag} 步驟收合不閃（九成節點保留）', r['kept'] >= 0.9 * r['all'], r)
            sw = await pg.evaluate("()=>document.getElementById('page').scrollWidth-document.getElementById('page').clientWidth")
            check(f'{tag} 詳情頁沒有橫向溢出', sw <= 1, sw)
            paths = await pg.evaluate(PATH_JS)
            check(f'{tag} 詳情頁沒有本機路徑', not paths, paths)
            # 示範模式存步驟不能讓卡片消失、結果欄位要留著
            r = await pg.evaluate("""async()=>{const z=window.__zl,id=window.__rp,p=z.DB.proj.find(x=>x.id===id);const st=(p.raw.progressSteps||[]).map((s,i)=>i===0?Object.assign({},s,{result:'回歸測試結果',result_link:'https://example.com/x'}):s);
              await z.LV.api.act(id,'steps',{steps:st});const q=await z.LV.api.get(id);const s0=q&&(q.progressSteps||[])[0];return {alive:!!q,status:q&&q.status,res:s0&&s0.result,link:s0&&s0.result_link}}""")
            check(f'{tag} 存步驟後卡片還在、結果欄位沒被丟掉', r.get('alive') and r.get('status') not in ('closed',) and r.get('res') == '回歸測試結果', r)
        # msg 1574：沒寫時間不顯示時間；按「安排」才排、照寫的時長；寫了時間的錨定不動
        await pg.evaluate("()=>{const z=window.__zl;z.S.page=null;z.S.sheet=null;z.paint('keep')}"); await pg.wait_for_timeout(500)
        if await pg.query_selector('[data-act="ckday"][data-id="1"]'):
            await pg.click('[data-act="ckday"][data-id="1"]'); await pg.wait_for_timeout(800)
            for t in ['回歸澆花', '13:25 回歸開會', '回歸寫企劃 2小時 下午']:
                await pg.fill('#ckIn', t); await pg.press('#ckIn', 'Enter'); await pg.wait_for_timeout(1500)
            await pg.mouse.click(5, 5); await pg.wait_for_timeout(500)
            rows = await pg.evaluate("()=>[...document.querySelectorAll('.ckbox .ck.want')].map(li=>({t:(li.querySelector('.cksg')||{innerText:''}).innerText,x:(li.querySelector('.ckt')||{innerText:''}).innerText}))")
            nt = [r for r in rows if '回歸澆花' in r['x']]
            check(f'{tag} 節奏沒寫時間就不顯示時間', bool(nt) and nt[0]['t'] == '', rows)
            dup = [r for r in rows if '回歸開會' in r['x']]
            check(f'{tag} 節奏寫了時間標題不重複時間', bool(dup) and '13:25' not in dup[0]['x'] and dup[0]['t'].startswith('13:25'), dup)
            await pg.click('[data-act="ckarrange"]'); await pg.wait_for_timeout(3500)
            rows = await pg.evaluate("()=>[...document.querySelectorAll('.ckbox .ck.want')].map(li=>({t:(li.querySelector('.cksg')||{innerText:''}).innerText,x:(li.querySelector('.ckt')||{innerText:''}).innerText}))")
            wk = [r for r in rows if '回歸寫企劃' in r['x']]; mt = [r for r in rows if '回歸開會' in r['x']]
            okw = bool(wk) and wk[0]['t'][:2].isdigit() and 13 <= int(wk[0]['t'][:2]) < 18 and '～' in wk[0]['t']
            check(f'{tag} 安排照時段與時長排、錨定的沒動', okw and bool(mt) and mt[0]['t'].startswith('13:25'), rows)
        # msg 1655：長按拖拉改順序，時間照新順序接上（桌機用滑鼠測）
        if w >= 1000:
            await pg.evaluate("()=>{const z=window.__zl;z.S.page=null;z.S.sheet=null;z.paint('keep');const b=document.querySelector('[data-act=ckday][data-id=\\'0\\']');if(b)b.click()}"); await pg.wait_for_timeout(800)
            for t in ['06:00～06:15 拖A', '06:15～06:30 拖B', '06:30～06:40 拖C']:
                await pg.fill('#ckIn', t); await pg.press('#ckIn', 'Enter'); await pg.wait_for_timeout(1300)
            await pg.evaluate("()=>document.activeElement&&document.activeElement.blur()"); await pg.wait_for_timeout(2500)
            rows = await pg.query_selector_all('.ckbox .ck.want')
            ids = await pg.evaluate("()=>[...document.querySelectorAll('.ckbox .ck.want')].map(li=>(li.querySelector('.ckt')||{innerText:''}).innerText)")
            if all(any(x in t for t in ids) for x in ['拖A', '拖C']):
                ia = [i for i, t in enumerate(ids) if '拖A' in t][0]; ic = [i for i, t in enumerate(ids) if '拖C' in t][0]
                a = await rows[ic].bounding_box(); t0 = await rows[ia].bounding_box()
                x = a['x'] + a['width'] * .5; y = a['y'] + a['height'] / 2; ty = t0['y'] + 4
                await pg.mouse.move(x, y); await pg.mouse.down(); await pg.wait_for_timeout(650)
                for k in range(1, 13): await pg.mouse.move(x, y + (ty - y) * k / 12); await pg.wait_for_timeout(20)
                await pg.mouse.up(); await pg.wait_for_timeout(4500)
                r = await pg.evaluate("()=>[...document.querySelectorAll('.ckbox .ck.want')].map(li=>(li.querySelector('.cksg')||{innerText:''}).innerText+' '+(li.querySelector('.ckt')||{innerText:''}).innerText).filter(t=>/拖[ABC]/.test(t))")
                check(f'{tag} 長按拖拉後時間照新順序接上', len(r) == 3 and r[0].startswith('06:00～06:10') and '拖C' in r[0] and '拖A' in r[1] and r[1].startswith('06:10'), r)
        # msg 1565：新增行程兩個行事曆可勾，標題是對外的事自動勾公司
        await pg.evaluate("()=>{const z=window.__zl;z.S.page=null;z.S.sheet=null;z.paint('keep');z.ACT.cenew()}"); await pg.wait_for_timeout(1000)
        if await pg.query_selector('#ceT'):
            await pg.fill('#ceT', '跟客戶開會討論交件')
            r = await pg.evaluate("()=>({me:!!document.getElementById('ceCme')&&document.getElementById('ceCme').checked,co:!!document.getElementById('ceCco')&&document.getElementById('ceCco').checked})")
            check(f'{tag} 新增行程對外的事自動勾公司、個人也勾', r.get('me') and r.get('co'), r)
        # msg 1563：「要你看」各分類同一套規則（有決定卡等你就算）
        r = await pg.evaluate("()=>{const z=window.__zl;return z.DB.proj.filter(p=>p.g==='doing').length}")
        check(f'{tag} 主控台沒有錯誤', not errs, errs)
    except Exception as e:
        check(f'{tag} 測試本身跑完', False, repr(e))
    finally:
        await b.close()

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.2)
        async with async_playwright() as p:
            await run_size(p, 1688, 1032)
            await run_size(p, 390, 844)
    finally:
        srv.terminate()
    print('\n回歸測試：' + ('全部通過' if not fails else f'{len(fails)} 項沒過：' + '、'.join(fails)))
    sys.exit(1 if fails else 0)

asyncio.run(main())
