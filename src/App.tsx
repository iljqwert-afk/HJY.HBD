import { useState, useEffect, useRef, ReactNode, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// MOBILE DETECTION
// ═══════════════════════════════════════════════════════════════
const IS_MOBILE = window.innerWidth <= 640 || ('ontouchstart' in window);
const sc = (n: number) => IS_MOBILE ? Math.max(2, n - 1) : n;

// Dynamic viewport height fix for mobile browsers
const setVh = () => {
  document.documentElement.style.setProperty('--dvh', `${window.innerHeight * 0.01}px`);
};
setVh();
window.addEventListener('resize', setVh, { passive: true });

// ═══════════════════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════
let _ac: AudioContext | null = null;
const ac = () => {
  if (!_ac) _ac = new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
};

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15) {
  try {
    const c = ac();
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(c.currentTime); o.stop(c.currentTime + dur);
  } catch {}
}

const sfx = {
  click:   () => tone(660, 0.06, 'square', 0.15),
  type:    () => tone(880, 0.03, 'square', 0.06),
  perfect: () => { tone(880, 0.08); setTimeout(() => tone(1320, 0.1), 50); },
  good:    () => tone(660, 0.1, 'square', 0.15),
  miss:    () => tone(200, 0.18, 'sawtooth', 0.2),
  success: () => [523,659,784,1047].forEach((f,i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.18), i*100)),
  fail:    () => [350,280,220].forEach((f,i) => setTimeout(() => tone(f, 0.15, 'sawtooth', 0.2), i*110)),
  wind:    () => tone(280, 0.25, 'sawtooth', 0.12),
  block:   () => { tone(440, 0.06); setTimeout(() => tone(550, 0.06), 40); },
  throw:   () => { tone(500, 0.07); setTimeout(() => tone(300, 0.18, 'sawtooth'), 70); },
  unlock:  () => [523,659,784,880,1047,1319].forEach((f,i) => setTimeout(() => tone(f, 0.1, 'triangle', 0.15), i*70)),
  dove:    () => [784,988,1175,1568].forEach((f,i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.15), i*130)),
  wrong:   () => { tone(220, 0.1, 'sawtooth'); setTimeout(() => tone(180, 0.18, 'sawtooth'), 100); },
  birthday:() => {
    const m = [523,523,587,523,698,659, 0,523,523,587,523,784,698];
    m.forEach((f,i) => { if(f) setTimeout(() => tone(f, 0.28, 'triangle', 0.18), i*270); });
  },
};

let _bgId: ReturnType<typeof setInterval> | null = null;
function playBg(theme: 'title'|'game1'|'game2'|'game3'|'game4'|'ending') {
  stopBg();
  const themes: Record<string, { n: number[]; bpm: number; t: OscillatorType }> = {
    title:  { n:[523,659,784,659,523,523,659,784,880,784,659,523], bpm:80,  t:'triangle' },
    game1:  { n:[784,784,880,784,880,988,880,784,659,784,880,988], bpm:138, t:'square'   },
    game2:  { n:[440,415,392,370,349,370,392,415,440,440,415,392], bpm:100, t:'triangle' },
    game3:  { n:[523,659,784,659,523,392,440,523,659,523,392,523], bpm:75,  t:'triangle' },
    game4:  { n:[659,784,880,988,1047,988,880,784,659,784,880,659], bpm:72, t:'triangle' },
    ending: { n:[1047,988,880,784,880,988,1047,1047,880,880,784,784], bpm:68,t:'triangle'},
  };
  const { n, bpm, t } = themes[theme];
  const iv = (60 / bpm) * 1000;
  let i = 0;
  _bgId = setInterval(() => { tone(n[i++ % n.length], iv/1000*0.75, t, 0.055); }, iv);
}
function stopBg() { if (_bgId != null) { clearInterval(_bgId); _bgId = null; } }

// ═══════════════════════════════════════════════════════════════
// PIXEL SPRITE ENGINE
// ═══════════════════════════════════════════════════════════════
const CC: Record<string, string|null> = {
  '.': null, ' ': null,
  S:'#FDBCB4', K:'#1a0a00', H:'#5C3317', h:'#8B5E3C',
  P:'#FF69B4', p:'#FFB6C1', J:'#FADADD',
  B:'#1565C0', b:'#42A5F5', c:'#B3E5FC',
  W:'#FFFFFF', A:'#B0BEC5', a:'#ECEFF1',
  G:'#2E7D32', g:'#66BB6A', e:'#A5D6A7',
  Y:'#F9A825', y:'#FFF176', f:'#FFCA28',
  R:'#C62828', r:'#EF5350',
  O:'#E65100', o:'#FF9800',
  N:'#5D4037', n:'#8D6E63', T:'#3E2723',
  C:'#00838F', q:'#80CBC4',
  Z:'#6A1B9A', z:'#CE93D8',
  M:'#AD1457', m:'#F48FB1',
  D:'#1B5E20', E:'#558B2F',
  I:'#1A237E', i:'#7986CB',
  V:'#4A148C', v:'#B39DDB',
  X:'#263238', x:'#90A4AE',
  L:'#BF360C', u:'#FF7043',
  F:'#FF6F00', Q:'#FFA000',
};
type Spr = (string|null)[][];
const ps = (rows: string[]): Spr => rows.map(row => [...row].map(c => CC[c] ?? null));

function Px({ s, scale, style }: { s: Spr; scale?: number; style?: React.CSSProperties }) {
  const sc2 = scale ?? 4;
  const h = s.length, w = s[0]?.length ?? 0;
  return (
    <svg width={w*sc2} height={h*sc2} style={{ imageRendering:'pixelated', display:'block', flexShrink:0, ...style }}>
      {s.flatMap((row,y) => row.map((col,x) =>
        col ? <rect key={`${x},${y}`} x={x*sc2} y={y*sc2} width={sc2} height={sc2} fill={col}/> : null
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SPRITES
// ═══════════════════════════════════════════════════════════════
const SP = {
  jiyu: ps([
    '....HHH.....',
    '...HHHHHHH..',
    '...HSSSSSH..',
    '...SKKS.KS..',
    '...SSSSSS...',
    '....SrSSr...',
    '.....SS.....',
    '..PPPPPPPP..',
    '.PPPPPPPPPP.',
    '.PPppppppPP.',
    '..PPPPPPPP..',
    '...SS..SS...',
    '...SS..SS...',
    '..NNN..NNN..',
  ]),
  ark: ps([
    '.........nnnnnnnnnnn.........',
    '........nNNNNNNNNNNNn........',
    '......nnnNNNNNNNNNNNNnnn.....',
    '.....nNNNKKNnNNnNKKNNNNNn....',
    '....nNNNNKKNnNNnNKKNNNNNNn...',
    '...nNNNNNNNnNNNNNnNNNNNNNNn..',
    '..NNnNnNnNnNnNnNnNnNnNnNnNNN.',
    '.NNNNNNNNNNNNNNNNNNNNNNNNNNNn',
    '.NnNnNnNnNnNnNnNnNnNnNnNnNnNN',
    '.TNNNNNNNNNNNNNNNNNNNNNNNNNNNT',
    '..TTTTTTTTTTTTTTTTTTTTTTTTTT..',
  ]),
  dove: ps([
    '....WW....',
    '...WWWW...',
    '..WWWWWWW.',
    '.WWWWWWWWW',
    'WWWWWWWWWW',
    '.WWWWWWWWW',
    '..WWWWWWW.',
    '....WW....',
    '....W.W...',
  ]),
  tree: ps([
    '....GG....',
    '...GGGG...',
    '..GGGGGG..',
    '.GGGGGGGG.',
    'GGGGGGGGGG',
    '.GGGGGGGG.',
    '..GGGGGG..',
    '...GGGG...',
    '....NN....',
    '....NN....',
    '....NN....',
  ]),
  log: ps([
    '.hhhhhhhhhh.',
    'NNNNNNNNNNNn',
    'NnNnNnNnNnNN',
    'NNNNNNNNNNNN',
    '.hhhhhhhhhh.',
  ]),
  lion: ps([
    '.FFFFFFFFF.',
    'FFFFFFFFFFF',
    'FFFSKKSFFFo',
    'FSSSSSSSFoo.',
    'FSSorSSFFo..',
    'FSSSSSaFF...',
    '.FS..SFF....',
    '.TT..TT.....',
  ]),
  elephant: ps([
    '..xxxxxxxx..',
    '.xxxxxxxxxx.',
    'xKxxKKxxxxxx',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    '.xxxxxxxxxx.',
    '.xx.xxxx.xx.',
    '.xx.xxxx.xx.',
    '....xxxx....',
  ]),
  candle: ps([
    '..y...',
    '.yYy..',
    '.YYY..',
    '..Y...',
    '.WWW..',
    '.WWW..',
    '.WWW..',
    '.WWW..',
    '.WWW..',
    '.nnn..',
    '.nnn..',
  ]),
  flame: ps([
    '..Y..',
    '.YyY.',
    'YyYyY',
    '.YYY.',
    '..f..',
  ]),
  wind: ps([
    '..bbb...',
    '.bbbbb..',
    'bbcbbbb.',
    'bbbcbbb.',
    'bbbbcbb.',
    '.bbbbb..',
    '..bbb...',
  ]),
  lock: ps([
    '...AAA...',
    '..A...A..',
    '.A.....A.',
    '.A.....A.',
    'AAAAAAAAA',
    'AfYYYYfAA',
    'AfYKKYfAA',
    'AfYYYYfAA',
    'AAAAAAAAA',
  ]),
  cage_open: ps([
    'NNNNNNN..',
    'N.N.N.N..',
    'N.N.N.N..',
    'N.N.N.N..',
    'N.N.N.N..',
    'NNNNNNN..',
  ]),
  rainbow: ps([
    '.....RRRRRRRRRR.....',
    '....RRooooooooRR....',
    '...RRooYYYYYooRR....',
    '..RRooYYggggYYooRR..',
    '.RRooYYggbbggYYooRR.',
    'RRooYYggbbIIbbggYYoo',
    'ooYYggbbIIiiIIbbggYY',
  ]),
  heart: ps([
    '.R.R.',
    'RRRRR',
    'RRRRR',
    '.RRR.',
    '..R..',
  ]),
  star: ps([
    '..Y..',
    '.YYY.',
    'YYYYY',
    '.YYY.',
    '..Y..',
  ]),
  noah: ps([
    '...hhhh...',
    '..HHHHHH..',
    '..HSSSSSH.',
    '..SKKs.KS.',
    '..SSSSSS..',
    '...SrSS...',
    '..BBBBBB..',
    '.BBBBBBBB.',
    '.BBbbbbBB.',
    '..BBBBBB..',
    '...SS.SS..',
    '...SS.SS..',
    '..NN..NN..',
  ]),
};

// ═══════════════════════════════════════════════════════════════
// COMMON UI
// ═══════════════════════════════════════════════════════════════
const FULL: React.CSSProperties = {
  width: '100vw',
  height: 'calc(var(--dvh, 1vh) * 100)',
  overflow: 'hidden',
  position: 'relative',
  fontFamily: "'Press Start 2P','Noto Sans KR',monospace",
};

function Stars({ n = 25 }: { n?: number }) {
  const st = Array.from({ length: n }, (_, i) => ({
    x: (i*37+13)%97, y: (i*53+7)%65,
    d: i*0.3, sz: i%3===0 ? 3:2, sp: 1.5+(i%4)*0.5,
  }));
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      {st.map((s,i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.sz, height:s.sz, background:'#FFD700',
          animation:`twinkle ${s.sp}s ease-in-out ${s.d}s infinite`,
        }}/>
      ))}
    </div>
  );
}

function Water({ height = '22%', stormy = false }: { height?: string; stormy?: boolean }) {
  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0, height,
      background: stormy
        ? 'linear-gradient(180deg,#0d2b6e 0%,#0a1f55 60%,#060f30 100%)'
        : 'linear-gradient(180deg,#1565C0 0%,#0D47A1 60%,#0a2472 100%)',
      overflow:'hidden', zIndex:1,
    }}>
      <div style={{
        position:'absolute', top:0, left:0, width:'200%', height:'14px',
        background: stormy
          ? 'repeating-linear-gradient(90deg,rgba(255,255,255,0.08) 0,rgba(255,255,255,0.08) 20px,transparent 20px,transparent 40px)'
          : 'repeating-linear-gradient(90deg,rgba(255,255,255,0.12) 0,rgba(255,255,255,0.12) 20px,transparent 20px,transparent 40px)',
        animation:`waveMove ${stormy ? 1.5 : 3}s linear infinite`,
      }}/>
      {stormy && (
        <div style={{
          position:'absolute', top:'20%', left:0, width:'200%', height:'10px',
          background:'repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 30px,transparent 30px,transparent 60px)',
          animation:'waveMove 2s linear 0.5s infinite',
        }}/>
      )}
    </div>
  );
}

function RainEffect() {
  const drops = Array.from({length: IS_MOBILE ? 12 : 20},(_, i)=>({
    x:(i*47+23)%100, delay: i*0.15, dur: 1.2+(i%4)*0.3,
  }));
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:2}}>
      {drops.map((d,i)=>(
        <div key={i} style={{
          position:'absolute', left:`${d.x}%`, top:0,
          width:2, height:18, background:'rgba(100,180,255,0.35)',
          animation:`rainFall ${d.dur}s linear ${d.delay}s infinite`,
        }}/>
      ))}
    </div>
  );
}

const BTN_BASE: React.CSSProperties = {
  fontFamily: "'Press Start 2P','Noto Sans KR',monospace",
  border: 'none',
  letterSpacing: '0.03em',
  lineHeight: '1.8',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

function PixBtn({ children, onClick, color='#FF69B4', textColor='#FFFFFF', disabled=false, style: es }: {
  children: ReactNode; onClick?: ()=>void; color?: string;
  textColor?: string; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={() => { if(!disabled) { sfx.click(); onClick?.(); } }}
      disabled={disabled}
      style={{
        ...BTN_BASE,
        background: disabled ? '#444' : color,
        color: disabled ? '#777' : textColor,
        padding: IS_MOBILE ? '14px 20px' : '12px 20px',
        fontSize: IS_MOBILE ? '11px' : '10px',
        minHeight: 48,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '4px 4px 0 #000',
        ...es,
      }}
      onPointerDown={e=>{ if(!disabled){ const el=e.currentTarget; el.style.boxShadow='2px 2px 0 #000'; el.style.transform='translate(2px,2px)'; }}}
      onPointerUp={e=>{ const el=e.currentTarget; el.style.boxShadow='4px 4px 0 #000'; el.style.transform=''; }}
      onPointerLeave={e=>{ const el=e.currentTarget; el.style.boxShadow='4px 4px 0 #000'; el.style.transform=''; }}
    >{children}</button>
  );
}

function Panel({ children, title, style:es }: { children:ReactNode; title?:string; style?:React.CSSProperties }) {
  return (
    <div style={{ background:'#1a0a2e', border:'4px solid #FFD700', padding: IS_MOBILE ? '16px' : '20px', boxShadow:'8px 8px 0 #000', ...es }}>
      {title && <div style={{color:'#FFD700',fontSize:'11px',marginBottom:'16px',textAlign:'center'}}>{title}</div>}
      {children}
    </div>
  );
}

function Hearts({ hp, max=3 }: { hp:number; max?:number }) {
  return (
    <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
      {Array.from({length:max},(_,i)=>(
        <div key={i} style={{opacity: i<hp ? 1 : 0.2, animation: i<hp ? 'heartBeat 1.2s ease-in-out infinite' : 'none'}}>
          <Px s={SP.heart} scale={sc(3)}/>
        </div>
      ))}
    </div>
  );
}

// Input: font-size MUST be >=16px on iOS to prevent auto-zoom
function PixInput({ value, onChange, placeholder, maxLength, type='text', center=false }: {
  value:string; onChange:(v:string)=>void; placeholder?:string;
  maxLength?:number; type?:string; center?:boolean;
}) {
  return (
    <input
      type={type} value={value} maxLength={maxLength} placeholder={placeholder}
      onChange={e=>{ sfx.type(); onChange(e.target.value); }}
      style={{
        fontFamily:"'Press Start 2P','Noto Sans KR',monospace",
        background:'#0d0d2e', color:'#FFD700', border:'3px solid #FFD700',
        padding:'12px 14px', fontSize:'16px', outline:'none', width:'100%',
        textAlign: center ? 'center' : 'left', letterSpacing:'0.05em',
        WebkitAppearance: 'none', borderRadius:0,
        boxSizing: 'border-box',
        touchAction: 'manipulation',
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════
type Scene = 'login'|'title'|'game1'|'game2'|'game3'|'game4'|'ending';

export default function App() {
  const [scene, setScene] = useState<Scene>('login');
  const [done, setDone] = useState<Set<number>>(new Set());

  const go = useCallback((s: Scene) => { stopBg(); setScene(s); }, []);
  const finish = useCallback((n:number, next:Scene) => {
    setDone(prev => { const s=new Set(prev); s.add(n); return s; });
    go(next);
  }, [go]);

  useEffect(()=>()=>{ stopBg(); },[]);

  switch(scene) {
    case 'login':  return <LoginScene   onNext={()=>go('title')}/>;
    case 'title':  return <TitleScene   done={done} onStart={g=>go(`game${g}` as Scene)} onEnding={()=>go('ending')}/>;
    case 'game1':  return <Game1Scene   onComplete={()=>finish(1,'title')} onBack={()=>go('title')}/>;
    case 'game2':  return <Game2Scene   onComplete={()=>finish(2,'title')} onBack={()=>go('title')}/>;
    case 'game3':  return <Game3Scene   onComplete={()=>finish(3,'title')} onBack={()=>go('title')}/>;
    case 'game4':  return <Game4Scene   onComplete={()=>finish(4,'ending')} onBack={()=>go('title')}/>;
    case 'ending': return <EndingScene  onBack={()=>go('title')}/>;
  }
}

// ═══════════════════════════════════════════════════════════════
// SCENE: LOGIN
// ═══════════════════════════════════════════════════════════════
function LoginScene({ onNext }: { onNext:()=>void }) {
  const [name, setName] = useState('');
  const [bday, setBday] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(()=>{ playBg('title'); return stopBg; },[]);

  const submit = () => {
    if (name.trim()==='한지유' && bday==='0824') {
      sfx.success(); setSuccess(true);
      setTimeout(onNext, 1100);
    } else {
      sfx.fail();
      setError(name.trim()!=='한지유' ? '이름이 틀렸어요! 🙈' : '생일이 맞지 않아요! 🎂');
      setShake(true);
      setTimeout(()=>{ setShake(false); setError(''); }, 1300);
    }
  };

  return (
    <div style={{ ...FULL, background:'#070714', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <Stars/>
      <Water/>
      <RainEffect/>

      {/* Floating Ark – smaller on mobile */}
      <div style={{
        position:'absolute', bottom:'17%', left:'50%', transform:'translateX(-50%)',
        animation:'arkBob 4s ease-in-out infinite', zIndex:2,
      }}>
        <Px s={SP.ark} scale={IS_MOBILE ? 1 : 2}/>
      </div>

      <div style={{ position:'relative', zIndex:3, display:'flex', flexDirection:'column', alignItems:'center', gap:20, padding:'0 16px', width:'100%', boxSizing:'border-box' }}>
        <div style={{ textAlign:'center', animation:'slideIn 0.6s ease-out' }}>
          <div style={{ fontSize: IS_MOBILE ? '20px' : '26px', color:'#FFD700', textShadow:'4px 4px 0 #000', marginBottom:8 }}>
            ⛵ 지유의 방주
          </div>
          <div style={{ fontSize:'9px', color:'#90CAF9' }}>
            방주에 탑승하려면 신원을 확인하세요
          </div>
        </div>

        <Panel style={{ width:'100%', maxWidth:360, animation:'slideIn 0.8s ease-out' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ color:'#90CAF9', fontSize:'9px', marginBottom:6 }}>👤 이름</div>
              <PixInput value={name} onChange={setName} placeholder="이름을 입력하세요"/>
            </div>
            <div>
              <div style={{ color:'#90CAF9', fontSize:'9px', marginBottom:6 }}>🎂 생일 4자리</div>
              <PixInput value={bday} onChange={setBday} placeholder="MMDD" maxLength={4} type="password" center/>
            </div>
            {error && (
              <div style={{ color:'#FF5252', fontSize:'9px', textAlign:'center', animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ color:'#4CAF50', fontSize:'9px', textAlign:'center', animation:'blink 0.4s ease-in-out infinite' }}>
                ✓ 환영합니다, 지유님!
              </div>
            )}
            <PixBtn onClick={submit} color="#FFD700" textColor="#000" style={{ width:'100%', fontSize:'12px' }}>
              ⛵ 방주에 탑승하기
            </PixBtn>
          </div>
        </Panel>

        <div style={{ fontSize:'8px', color:'#4a5568', textAlign:'center' }}>
          힌트: 이름 + 생일 4자리(MMDD)
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE: TITLE HUB
// ═══════════════════════════════════════════════════════════════
function TitleScene({ done, onStart, onEnding }: { done:Set<number>; onStart:(g:number)=>void; onEnding:()=>void }) {
  const allDone = [1,2,3,4].every(n=>done.has(n));
  useEffect(()=>{ playBg('title'); return stopBg; },[]);

  const games = [
    { n:1, icon:'⚒️', label:'방주 만들기', sub:'나무+동물 리듬게임', color:'#8B4513', lock:false },
    { n:2, icon:'🕯️', label:'촛불 지키기', sub:'바람을 막아요!',     color:'#1565C0', lock:!done.has(1) },
    { n:3, icon:'📦', label:'짐 버리기',   sub:'버릴 짐을 골라요',   color:'#4A148C', lock:!done.has(2) },
    { n:4, icon:'🕊️', label:'비둘기 날리기', sub:'암호를 풀어요!',  color:'#1B5E20', lock:!done.has(3) },
  ];

  return (
    <div style={{ ...FULL, background:'#0a0e1a', display:'flex', flexDirection:'column', alignItems:'center', overflowY:'auto', overflowX:'hidden' }}>
      <Stars n={20}/>
      <RainEffect/>
      <Water height={IS_MOBILE ? '22%' : '28%'} stormy/>

      {/* Ark & Animals – only on non-mobile to save space */}
      {!IS_MOBILE && (
        <>
          <div style={{ position:'absolute', bottom:'22%', left:'50%', transform:'translateX(-50%)', animation:'arkBob 5s ease-in-out infinite', zIndex:2 }}>
            <Px s={SP.ark} scale={3}/>
          </div>
          <div style={{ position:'absolute', bottom:'33%', left:'calc(50% - 60px)', zIndex:3, animation:'float 3s ease-in-out 0.5s infinite' }}>
            <Px s={SP.lion} scale={2}/>
          </div>
          <div style={{ position:'absolute', bottom:'33%', left:'calc(50% + 20px)', zIndex:3, animation:'float 3.5s ease-in-out infinite' }}>
            <Px s={SP.elephant} scale={2}/>
          </div>
        </>
      )}
      {IS_MOBILE && (
        <div style={{ position:'absolute', bottom:'18%', left:'50%', transform:'translateX(-50%)', animation:'arkBob 5s ease-in-out infinite', zIndex:2 }}>
          <Px s={SP.ark} scale={2}/>
        </div>
      )}

      <div style={{ position:'relative', zIndex:4, display:'flex', flexDirection:'column', alignItems:'center', width:'100%', padding: IS_MOBILE ? '16px 16px 24px' : '16px 16px 220px', boxSizing:'border-box', gap: IS_MOBILE ? 10 : 12 }}>
        {/* Title */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize: IS_MOBILE ? '18px' : '24px', color:'#FFD700', textShadow:'4px 4px 0 #000', marginBottom:6 }}>
            ⛵ 지유의 방주
          </div>
          <div style={{ fontSize:'9px', color:'#FFB6C1' }}>
            🎂 한지유님의 생일을 축하합니다! 🎂
          </div>
        </div>

        {/* Game buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:480 }}>
          {games.map(({ n, icon, label, sub, color, lock }) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:10, animation:`slideIn ${0.3+n*0.15}s ease-out` }}>
              <PixBtn
                onClick={() => onStart(n)}
                color={done.has(n) ? '#2E7D32' : lock ? '#333' : color}
                disabled={lock}
                style={{ flex:1, textAlign:'left', fontSize: IS_MOBILE ? '9px' : '10px', minHeight:52 }}
              >
                {done.has(n) ? '✓ ' : lock ? '🔒 ' : ''}{icon} {label}
              </PixBtn>
              {/* Description only on wider screens */}
              {!IS_MOBILE && (
                <div style={{ fontSize:'7px', color: lock ? '#444' : '#90A4AE', width:100, flexShrink:0, lineHeight:1.8 }}>
                  {sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {allDone && (
          <div style={{ textAlign:'center', animation:'popIn 0.5s ease-out', marginTop:8 }}>
            <div style={{ color:'#FFD700', fontSize:'9px', marginBottom:10 }}>🌈 모든 미션 완료!</div>
            <PixBtn onClick={onEnding} color="#FF69B4" style={{ fontSize:'12px' }}>
              🎂 생일 메시지 보기 🎂
            </PixBtn>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE: GAME 1 – RHYTHM GAME
// ═══════════════════════════════════════════════════════════════
type RhNote = { id:number; lane:0|1; targetMs:number; state:'active'|'hit'|'missed' };
type Feedback = { lane:0|1; text:string; color:string; key:number } | null;

const GAME1_PATTERN: Array<{lane:0|1;t:number}> = [
  {lane:0,t:800},  {lane:1,t:1250}, {lane:0,t:1700}, {lane:1,t:2150},
  {lane:0,t:2600}, {lane:0,t:2850}, {lane:1,t:3300}, {lane:1,t:3550},
  {lane:0,t:4000}, {lane:1,t:4450}, {lane:0,t:4900}, {lane:1,t:5350},
  {lane:0,t:5600}, {lane:1,t:5850}, {lane:0,t:6300}, {lane:1,t:6750},
];
const FALL_DUR = 1800;
const HIT_Y    = 75;
const PERFECT_MS = 160;
const GOOD_MS    = 300;

function Game1Scene({ onComplete, onBack }: { onComplete:()=>void; onBack:()=>void }) {
  const [phase, setPhase] = useState<'intro'|'playing'|'result'>('intro');
  const [displayNotes, setDisplayNotes] = useState<{id:number;lane:0|1;y:number;state:string}[]>([]);
  const [scores, setScores] = useState({p:0,g:0,m:0});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [combo, setCombo] = useState(0);

  const stRef = useRef({
    notes: [] as RhNote[],
    start: 0,
    scores: {p:0,g:0,m:0},
    combo: 0,
    fbKey: 0,
  });
  const loopRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{ playBg('game1'); return stopBg; },[]);
  useEffect(()=>()=>{ if(loopRef.current) clearInterval(loopRef.current); },[]);

  const startGame = () => {
    const st = stRef.current;
    st.notes = GAME1_PATTERN.map((p,i) => ({ id:i, lane:p.lane, targetMs:p.t, state:'active' as const }));
    st.start = performance.now();
    st.scores = {p:0,g:0,m:0};
    st.combo = 0;
    setScores({p:0,g:0,m:0});
    setCombo(0);
    setDisplayNotes([]);
    setPhase('playing');

    const endMs = GAME1_PATTERN[GAME1_PATTERN.length-1].t + FALL_DUR + 400;

    loopRef.current = setInterval(() => {
      const elapsed = performance.now() - st.start;
      let changed = false;
      for (const n of st.notes) {
        if (n.state==='active' && elapsed > n.targetMs + GOOD_MS + 50) {
          n.state='missed'; st.scores.m++; st.combo=0; changed=true;
        }
      }
      if (changed) { setScores({...st.scores}); setCombo(0); }

      const disp = st.notes
        .filter(n => { const p=(elapsed-(n.targetMs-FALL_DUR))/FALL_DUR; return p>-0.1&&p<1.15&&n.state!=='hit'; })
        .map(n => { const p=(elapsed-(n.targetMs-FALL_DUR))/FALL_DUR; return {id:n.id,lane:n.lane,y:p*100,state:n.state}; });
      setDisplayNotes(disp);

      if (elapsed > endMs && st.notes.every(n=>n.state!=='active')) {
        clearInterval(loopRef.current!); loopRef.current=null;
        setScores({...st.scores}); setPhase('result');
      }
    }, 16);
  };

  const pressLane = (lane:0|1) => {
    const st = stRef.current;
    const elapsed = performance.now() - st.start;
    const active = st.notes.filter(n=>n.state==='active'&&n.lane===lane);
    const k = ++st.fbKey;
    if (!active.length) {
      sfx.miss(); st.scores.m++; st.combo=0;
      setFeedback({lane,text:'MISS!',color:'#EF5350',key:k});
      setTimeout(()=>setFeedback(f=>f?.key===k?null:f),380);
      setScores({...st.scores}); setCombo(0); return;
    }
    const closest = active.reduce((a,b)=>Math.abs(elapsed-a.targetMs)<Math.abs(elapsed-b.targetMs)?a:b);
    const diff = Math.abs(elapsed - closest.targetMs);
    closest.state = 'hit';
    if (diff <= PERFECT_MS) {
      sfx.perfect(); st.scores.p++; st.combo++;
      setFeedback({lane,text:'PERFECT!✨',color:'#FFD700',key:k});
    } else if (diff <= GOOD_MS) {
      sfx.good(); st.scores.g++; st.combo++;
      setFeedback({lane,text:'GOOD!👍',color:'#4CAF50',key:k});
    } else {
      sfx.miss(); st.scores.m++; st.combo=0;
      setFeedback({lane,text:'MISS!😢',color:'#EF5350',key:k});
    }
    setTimeout(()=>setFeedback(f=>f?.key===k?null:f),380);
    setScores({...st.scores}); setCombo(st.combo);
  };

  const total = scores.p+scores.g;
  const passed = total >= 10;

  if (phase==='intro') return (
    <div style={{ ...FULL, background:'#1a0800', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars n={20}/>
      <div style={{ color:'#FFD700', fontSize:IS_MOBILE?'16px':'18px', textShadow:'3px 3px 0 #000' }}>⚒️ 방주 만들기</div>
      <Panel style={{ maxWidth:340, width:'calc(100% - 32px)', textAlign:'center' }}>
        <div style={{ color:'#FFB6C1', fontSize:'9px', lineHeight:2.2 }}>
          방주를 만들 재료를 모으세요!<br/>
          박자에 맞게 버튼을 눌러요.<br/><br/>
          🪓 왼쪽 = 나무 자르기<br/>
          🦁 오른쪽 = 동물 모으기<br/><br/>
          <span style={{color:'#FFD700'}}>16개 중 10개 이상 성공!</span>
        </div>
      </Panel>
      <div style={{ display:'flex', gap:12 }}>
        <PixBtn onClick={startGame} color="#FF9800" textColor="#000">▶ 시작!</PixBtn>
        <PixBtn onClick={onBack} color="#546E7A">← 뒤로</PixBtn>
      </div>
    </div>
  );

  if (phase==='result') return (
    <div style={{ ...FULL, background:'#1a0800', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars/>
      <div style={{ color:'#FFD700', fontSize:'20px', animation:'popIn 0.5s ease-out' }}>{passed?'🎉 성공!':'😢 실패...'}</div>
      <Panel style={{ textAlign:'center', width:'calc(100% - 32px)', maxWidth:340 }}>
        <div style={{ color:'#FFD700', fontSize:'9px', lineHeight:2 }}>
          PERFECT:{scores.p} GOOD:{scores.g} MISS:{scores.m}<br/>
          <span style={{color: passed?'#4CAF50':'#EF5350'}}>
            {passed?'방주 재료를 모았습니다! 🪵':'조금 더 연습이 필요해요!'}
          </span>
        </div>
      </Panel>
      {passed
        ? <PixBtn onClick={onComplete} color="#4CAF50">다음으로 →</PixBtn>
        : <PixBtn onClick={startGame} color="#FF9800" textColor="#000">다시 하기</PixBtn>
      }
      <PixBtn onClick={onBack} color="#546E7A">← 메인으로</PixBtn>
    </div>
  );

  const noteScale = IS_MOBILE ? 2 : 3;

  return (
    <div style={{ ...FULL, background:'#1a0800', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#3E2723', borderBottom:'4px solid #FFD700', flexShrink:0 }}>
        <div style={{ color:'#FFD700', fontSize:'8px' }}>⚒️ 방주 만들기</div>
        <div style={{ color:'#FFD700', fontSize:'8px' }}>✓{scores.p+scores.g} ✗{scores.m} 🔥{combo}</div>
      </div>

      {/* Lanes */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Left lane */}
        <div style={{ flex:1, position:'relative', borderRight:'4px solid #5D4037', background:'linear-gradient(180deg,#2d1200 0%,#3E2723 100%)', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:6, left:'50%', transform:'translateX(-50%)', color:'#FF9800', fontSize:'7px', whiteSpace:'nowrap', zIndex:2 }}>🪓 나무</div>
          <div style={{ position:'absolute', top:`${HIT_Y}%`, left:0, right:0, height:4, background:'#FFD700', opacity:0.7, zIndex:2 }}/>
          {displayNotes.filter(n=>n.lane===0).map(n=>(
            <div key={n.id} style={{ position:'absolute', top:`${n.y}%`, left:'50%', transform:'translateX(-50%)', opacity:n.state==='missed'?0.25:1, zIndex:1 }}>
              <Px s={SP.log} scale={noteScale}/>
            </div>
          ))}
          {feedback?.lane===0 && (
            <div style={{ position:'absolute', top:'32%', left:'50%', transform:'translateX(-50%)', color:feedback.color, fontSize:'9px', animation:'fadeUp 0.4s ease-out', whiteSpace:'nowrap', zIndex:3 }}>
              {feedback.text}
            </div>
          )}
        </div>

        {/* Right lane */}
        <div style={{ flex:1, position:'relative', background:'linear-gradient(180deg,#0d2600 0%,#1B5E20 100%)', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:6, left:'50%', transform:'translateX(-50%)', color:'#81C784', fontSize:'7px', whiteSpace:'nowrap', zIndex:2 }}>🦁 동물</div>
          <div style={{ position:'absolute', top:`${HIT_Y}%`, left:0, right:0, height:4, background:'#4CAF50', opacity:0.7, zIndex:2 }}/>
          {displayNotes.filter(n=>n.lane===1).map(n=>(
            <div key={n.id} style={{ position:'absolute', top:`${n.y}%`, left:'50%', transform:'translateX(-50%)', opacity:n.state==='missed'?0.25:1, zIndex:1 }}>
              <Px s={SP.lion} scale={noteScale}/>
            </div>
          ))}
          {feedback?.lane===1 && (
            <div style={{ position:'absolute', top:'32%', left:'50%', transform:'translateX(-50%)', color:feedback.color, fontSize:'9px', animation:'fadeUp 0.4s ease-out', whiteSpace:'nowrap', zIndex:3 }}>
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      {/* Hit buttons – tall for mobile */}
      <div style={{ display:'flex', gap:8, padding:IS_MOBILE ? '10px 10px env(safe-area-inset-bottom,10px)' : '12px', background:'#3E2723', borderTop:'4px solid #FFD700', flexShrink:0 }}>
        <button
          onPointerDown={()=>pressLane(0)}
          style={{
            ...BTN_BASE,
            flex:1, height: IS_MOBILE ? 80 : 68,
            background:'#8B4513', color:'#FFD700',
            fontSize: IS_MOBILE ? '12px' : '11px',
            border:'4px solid #FF9800', cursor:'pointer', boxShadow:'4px 4px 0 #000',
          }}
        >🪓<br/>나무 자르기</button>
        <button
          onPointerDown={()=>pressLane(1)}
          style={{
            ...BTN_BASE,
            flex:1, height: IS_MOBILE ? 80 : 68,
            background:'#2E7D32', color:'#FFD700',
            fontSize: IS_MOBILE ? '12px' : '11px',
            border:'4px solid #4CAF50', cursor:'pointer', boxShadow:'4px 4px 0 #000',
          }}
        >🦁<br/>동물 모으기</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE: GAME 2 – WHACK-A-WIND
// ═══════════════════════════════════════════════════════════════
type WindBlob = { id:number; pos:number; born:number; lifetime:number };

// Tighter radius on mobile (portrait), safe zone
const WIND_R = IS_MOBILE ? 33 : 36;
const WIND_POSITIONS = Array.from({length:8},(_,i)=>({
  x: 50 + WIND_R * Math.cos(i*Math.PI/4 - Math.PI/2),
  y: 50 + WIND_R * Math.sin(i*Math.PI/4 - Math.PI/2),
}));

function Game2Scene({ onComplete, onBack }: { onComplete:()=>void; onBack:()=>void }) {
  const [phase, setPhase] = useState<'intro'|'playing'|'result'>('intro');
  const [blobs, setBlobs] = useState<WindBlob[]>([]);
  const [hp, setHp] = useState(3);
  const [timeLeft, setTimeLeft] = useState(35);
  const [score, setScore] = useState(0);
  const [flicker, setFlicker] = useState(false);

  const stRef = useRef({ hp:3, score:0, blobId:0, phase:'intro' as string });
  const spawnRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const tickRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const blobRef  = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{ playBg('game2'); return stopBg; },[]);
  useEffect(()=>()=>{
    if(spawnRef.current) clearTimeout(spawnRef.current);
    if(tickRef.current)  clearInterval(tickRef.current);
    if(blobRef.current)  clearInterval(blobRef.current);
  },[]);

  const startGame = () => {
    stRef.current = { hp:3, score:0, blobId:0, phase:'playing' };
    setHp(3); setScore(0); setBlobs([]); setTimeLeft(35); setFlicker(false);
    setPhase('playing');

    let t = 35;
    tickRef.current = setInterval(()=>{
      t--;
      setTimeLeft(t);
      if (t<=0) {
        clearInterval(tickRef.current!); if(spawnRef.current) clearTimeout(spawnRef.current); clearInterval(blobRef.current!);
        setPhase('result');
      }
    },1000);

    blobRef.current = setInterval(()=>{
      const now = Date.now();
      setBlobs(prev=>{
        const expired = prev.filter(b=>now-b.born > b.lifetime);
        if (expired.length>0) {
          stRef.current.hp = Math.max(0, stRef.current.hp - expired.length);
          setHp(stRef.current.hp);
          setFlicker(true); setTimeout(()=>setFlicker(false),300);
          if (stRef.current.hp<=0) {
            clearInterval(tickRef.current!); if(spawnRef.current) clearTimeout(spawnRef.current); clearInterval(blobRef.current!);
            stRef.current.phase='result'; setPhase('result');
          }
        }
        return prev.filter(b=>now-b.born<=b.lifetime);
      });
    },200);

    let spawnIv = 1800;
    const spawn = () => {
      if (stRef.current.phase!=='playing') return;
      const pos = Math.floor(Math.random()*8);
      const lifetime = 2200 + Math.random()*800;
      const blob: WindBlob = { id: stRef.current.blobId++, pos, born:Date.now(), lifetime };
      sfx.wind();
      setBlobs(prev=>[...prev.filter(b=>b.pos!==pos), blob]);
      spawnIv = Math.max(900, spawnIv - 40);
      spawnRef.current = setTimeout(spawn, spawnIv);
    };
    spawnRef.current = setTimeout(spawn, 600);
  };

  const blockBlob = (id:number) => {
    sfx.block(); stRef.current.score++;
    setScore(s=>s+1);
    setBlobs(prev=>prev.filter(b=>b.id!==id));
  };

  const passed = stRef.current.hp > 0 && timeLeft <= 0;
  const blobTouchSize = IS_MOBILE ? 72 : 56;

  if (phase==='intro') return (
    <div style={{ ...FULL, background:'#0d1b3e', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars/><RainEffect/>
      <div style={{ color:'#FFD700', fontSize:IS_MOBILE?'16px':'18px', textShadow:'3px 3px 0 #000' }}>🕯️ 촛불 지키기</div>
      <Panel style={{ maxWidth:340, width:'calc(100% - 32px)', textAlign:'center' }}>
        <div style={{ color:'#FFB6C1', fontSize:'9px', lineHeight:2.2 }}>
          사방에서 불어오는 바람 덩어리를<br/>
          <span style={{color:'#FFD700'}}>탭해서 막아요!</span><br/><br/>
          <span style={{color:'#EF5350'}}>❤️❤️❤️ 세 번 맞으면 실패!</span><br/>
          <span style={{color:'#FFD700'}}>35초 버티면 성공! 🕯️</span>
        </div>
      </Panel>
      <div style={{ display:'flex', gap:12 }}>
        <PixBtn onClick={startGame} color="#1565C0">▶ 시작!</PixBtn>
        <PixBtn onClick={onBack} color="#546E7A">← 뒤로</PixBtn>
      </div>
    </div>
  );

  if (phase==='result') return (
    <div style={{ ...FULL, background:'#0d1b3e', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars/>
      <div style={{ color:'#FFD700', fontSize:'20px', animation:'popIn 0.5s ease-out' }}>{passed?'🎉 성공!':'💨 실패...'}</div>
      <Panel style={{ textAlign:'center', width:'calc(100% - 32px)', maxWidth:340 }}>
        <div style={{ color:'#FFD700', fontSize:'9px', lineHeight:2 }}>
          막은 바람: {score}개<br/>
          <span style={{color: passed?'#4CAF50':'#EF5350'}}>
            {passed?'촛불을 지켰습니다! 🕯️✨':'바람이 촛불을 껐어요... 💨'}
          </span>
        </div>
      </Panel>
      {passed
        ? <PixBtn onClick={onComplete} color="#4CAF50">다음으로 →</PixBtn>
        : <PixBtn onClick={startGame} color="#1565C0">다시 하기</PixBtn>
      }
      <PixBtn onClick={onBack} color="#546E7A">← 메인으로</PixBtn>
    </div>
  );

  return (
    <div style={{ ...FULL, background:'#0d1b3e', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', background:'#0a1230', borderBottom:'4px solid #1565C0', flexShrink:0 }}>
        <Hearts hp={hp}/>
        <div style={{ color:'#FFD700', fontSize:'9px' }}>⏱ {timeLeft}s</div>
        <div style={{ color:'#42A5F5', fontSize:'9px' }}>💨 {score}</div>
      </div>

      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <Stars n={12}/>
        <RainEffect/>
        <Water height="18%" stormy/>

        {/* Candle */}
        <div style={{
          position:'absolute', left:'50%', top:'45%', transform:'translate(-50%,-50%)',
          animation: flicker ? 'shake 0.3s ease-in-out' : undefined, zIndex:5,
        }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ animation:'float 0.8s ease-in-out infinite', opacity: flicker?0.3:1 }}>
              <Px s={SP.flame} scale={sc(4)}/>
            </div>
            <Px s={SP.candle} scale={sc(4)}/>
          </div>
        </div>

        {/* Wind blobs – large tap area for mobile */}
        {blobs.map(blob=>{
          const pos = WIND_POSITIONS[blob.pos];
          const age = (Date.now()-blob.born)/blob.lifetime;
          return (
            <div
              key={blob.id}
              onPointerDown={e=>{ e.preventDefault(); blockBlob(blob.id); }}
              style={{
                position:'absolute',
                left:`${pos.x}%`, top:`${pos.y}%`,
                transform:'translate(-50%,-50%)',
                cursor:'pointer', zIndex:6,
                // Large touch target
                width: blobTouchSize, height: blobTouchSize,
                display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
                opacity: Math.max(0.35, 1-age*0.5),
                animation:'windPulse 0.6s ease-in-out infinite',
                touchAction:'none',
              }}
            >
              <Px s={SP.wind} scale={IS_MOBILE ? 3 : 4}/>
              <div style={{ fontSize:'6px', color:'#B3E5FC', marginTop:2, whiteSpace:'nowrap' }}>탭!</div>
            </div>
          );
        })}

        {hp===1 && (
          <div style={{ position:'absolute', inset:0, background:'rgba(100,0,0,0.15)', animation:'blink 1s ease-in-out infinite', pointerEvents:'none', zIndex:4 }}/>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE: GAME 3 – THROW THE BAGGAGE
// ═══════════════════════════════════════════════════════════════
const BAGGAGE_ITEMS = [
  { id:'a', label:'미래에 대한 불안', emoji:'😰', correct:true },
  { id:'b', label:'친구들과의 추억', emoji:'🤝', correct:false },
  { id:'c', label:'가족의 사랑',     emoji:'❤️', correct:false },
  { id:'d', label:'신앙의 믿음',     emoji:'🙏', correct:false },
];

function Game3Scene({ onComplete, onBack }: { onComplete:()=>void; onBack:()=>void }) {
  const [phase, setPhase] = useState<'intro'|'playing'|'result'>('intro');
  const [selected, setSelected] = useState<string|null>(null);
  const [msg, setMsg] = useState('');
  const [thrown, setThrown] = useState<string|null>(null);
  const [wrongShake, setWrongShake] = useState<string|null>(null);

  useEffect(()=>{ playBg('game3'); return stopBg; },[]);

  const pick = (id:string, correct:boolean) => {
    if (selected) return;
    setSelected(id);
    if (correct) {
      sfx.throw(); setThrown(id);
      setMsg('잘 했어요! 불안은 하나님께 맡겨요 🌊✨');
      setTimeout(()=>{ sfx.success(); }, 600);
      setTimeout(()=>setPhase('result'), 1800);
    } else {
      sfx.wrong(); setWrongShake(id);
      const msgs: Record<string,string> = {
        b:'이건 버릴 수 없어요!\n추억은 영원해요 🤝',
        c:'이건 절대 안 돼요!\n사랑은 짐이 아니에요 ❤️',
        d:'믿음은 오히려 힘이 돼요! 🙏',
      };
      setMsg(msgs[id] || '이건 버릴 수 없어요!');
      setTimeout(()=>{ setWrongShake(null); setSelected(null); setMsg(''); }, 1500);
    }
  };

  if (phase==='intro') return (
    <div style={{ ...FULL, background:'#1a0a3e', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars/><RainEffect/><Water stormy/>
      <div style={{ position:'relative', zIndex:3, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ color:'#FFD700', fontSize:IS_MOBILE?'16px':'18px', textShadow:'3px 3px 0 #000' }}>📦 짐 버리기</div>
        <Panel style={{ maxWidth:340, width:'calc(100% - 32px)', textAlign:'center' }}>
          <div style={{ color:'#FFB6C1', fontSize:'9px', lineHeight:2.2 }}>
            파도가 너무 거세요!<br/>
            버릴 수 있는 짐을 골라보세요.<br/>
            <span style={{color:'#FFD700'}}>올바른 짐을 골라야 해요! 💭</span>
          </div>
        </Panel>
        <div style={{ display:'flex', gap:12 }}>
          <PixBtn onClick={()=>setPhase('playing')} color="#4A148C">▶ 시작!</PixBtn>
          <PixBtn onClick={onBack} color="#546E7A">← 뒤로</PixBtn>
        </div>
      </div>
    </div>
  );

  if (phase==='result') return (
    <div style={{ ...FULL, background:'#1a0a3e', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars/>
      <div style={{ color:'#FFD700', fontSize:'18px', animation:'popIn 0.5s ease-out' }}>🎉 잘 버렸어요!</div>
      <Panel style={{ maxWidth:360, width:'calc(100% - 32px)', textAlign:'center' }}>
        <div style={{ color:'#FFD700', fontSize:'9px', lineHeight:2, marginBottom:12 }}>{msg}</div>
        <div style={{ color:'#a0c4ff', fontSize:'8px', lineHeight:2 }}>
          미래에 대한 불안은 하나님께 맡기세요 🙏<br/><br/>
          <span style={{color:'#FFD700'}}>"내가 너와 함께 있어<br/>네게 복을 주리라"</span>
        </div>
      </Panel>
      <PixBtn onClick={onComplete} color="#4CAF50">다음으로 →</PixBtn>
      <PixBtn onClick={onBack} color="#546E7A">← 메인으로</PixBtn>
    </div>
  );

  return (
    <div style={{ ...FULL, background:'#1a0a3e', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <Stars n={12}/><RainEffect/><Water height="15%" stormy/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, position:'relative', zIndex:3, padding:'8px 12px', boxSizing:'border-box' }}>
        <div style={{ color:'#FFD700', fontSize:'13px', textShadow:'2px 2px 0 #000' }}>📦 짐 버리기</div>
        <div style={{ color:'#FFB6C1', fontSize:'8px', textAlign:'center', lineHeight:1.8 }}>
          파도가 너무 거세요! 버릴 짐을 고르세요.
        </div>

        {/* Ark + character – smaller on mobile */}
        {!IS_MOBILE && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            <div style={{ animation:'arkBob 4s ease-in-out infinite' }}>
              <Px s={SP.ark} scale={2}/>
            </div>
            <div style={{ animation:'float 2s ease-in-out infinite', marginBottom:10 }}>
              <Px s={SP.jiyu} scale={2}/>
            </div>
          </div>
        )}

        {/* Luggage grid – 2col on mobile landscape / tablet, 1col on tiny portrait */}
        <div style={{
          display:'grid',
          gridTemplateColumns: window.innerWidth < 360 ? '1fr' : '1fr 1fr',
          gap:10, width:'100%', maxWidth:400,
        }}>
          {BAGGAGE_ITEMS.map(item=>(
            <button
              key={item.id}
              onPointerDown={()=>pick(item.id, item.correct)}
              style={{
                ...BTN_BASE,
                background: thrown===item.id ? 'transparent' : '#1a0a2e',
                border: `3px solid ${wrongShake===item.id ? '#EF5350' : '#8D6E63'}`,
                color:'#FFD700', padding: IS_MOBILE ? '14px 8px' : '12px 8px',
                cursor:'pointer', fontSize:'8px', lineHeight:2, textAlign:'center',
                boxShadow:'4px 4px 0 #000', minHeight:72,
                animation: wrongShake===item.id ? 'shake 0.5s ease-in-out' : thrown===item.id ? 'throwOut 1.5s ease-in forwards' : undefined,
                opacity: selected && selected!==item.id && thrown!==item.id ? 0.5 : 1,
              }}
            >
              <div style={{fontSize:'22px', marginBottom:4}}>{item.emoji}</div>
              {item.label}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ color: thrown ? '#4CAF50':'#EF5350', fontSize:'8px', textAlign:'center', maxWidth:280, lineHeight:2, animation:'slideIn 0.3s ease-out', whiteSpace:'pre-line' }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE: GAME 4 – DOVE LOCK
// ═══════════════════════════════════════════════════════════════
function Game4Scene({ onComplete, onBack }: { onComplete:()=>void; onBack:()=>void }) {
  const [phase, setPhase] = useState<'intro'|'playing'|'unlocking'|'result'>('intro');
  const [digits, setDigits] = useState(['','','','']);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [dovePos, setDovePos] = useState(0);
  const d0 = useRef<HTMLInputElement>(null);
  const d1 = useRef<HTMLInputElement>(null);
  const d2 = useRef<HTMLInputElement>(null);
  const d3 = useRef<HTMLInputElement>(null);
  const inputRefs = [d0,d1,d2,d3];

  useEffect(()=>{ playBg('game4'); return stopBg; },[]);

  const tryUnlock = () => {
    const code = digits.join('');
    if (code==='0824') {
      sfx.unlock(); setPhase('unlocking');
      let pos = 0;
      const iv = setInterval(()=>{
        pos++; setDovePos(pos);
        if (pos>=6) { clearInterval(iv); sfx.dove(); setTimeout(()=>{ sfx.success(); setPhase('result'); }, 1200); }
      }, 300);
    } else {
      sfx.wrong(); setShake(true);
      setError(code.length<4 ? '4자리를 모두 입력해주세요!' : '암호가 맞지 않아요! 🔒');
      setTimeout(()=>{ setShake(false); setError(''); }, 1300);
    }
  };

  const handleDigit = (idx:number, val:string) => {
    sfx.type();
    const d = val.replace(/\D/,'').slice(-1);
    const next = [...digits]; next[idx]=d; setDigits(next);
    if (d && idx<3) inputRefs[idx+1].current?.focus();
  };

  const handleKey = (idx:number, e:React.KeyboardEvent) => {
    if (e.key==='Backspace' && !digits[idx] && idx>0) inputRefs[idx-1].current?.focus();
    if (e.key==='Enter') tryUnlock();
  };

  // Digit input size
  const dW = IS_MOBILE ? 56 : 48;
  const dH = IS_MOBILE ? 68 : 56;
  const dFS = IS_MOBILE ? 26 : 22;

  if (phase==='intro') return (
    <div style={{ ...FULL, background:'#0a1a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <Stars/>
      <div style={{ color:'#FFD700', fontSize:IS_MOBILE?'16px':'18px', textShadow:'3px 3px 0 #000' }}>🕊️ 비둘기 날리기</div>
      <Panel style={{ maxWidth:340, width:'calc(100% - 32px)', textAlign:'center' }}>
        <div style={{ color:'#FFB6C1', fontSize:'9px', lineHeight:2.2 }}>
          홍수가 끝났어요! 🌤️<br/>
          비둘기장 자물쇠를 열어<br/>
          비둘기를 날려보내세요!<br/><br/>
          <span style={{color:'#FFD700'}}>생일 4자리를 입력하세요 🔑</span>
        </div>
      </Panel>
      <div style={{ display:'flex', gap:12 }}>
        <PixBtn onClick={()=>setPhase('playing')} color="#1B5E20">▶ 시작!</PixBtn>
        <PixBtn onClick={onBack} color="#546E7A">← 뒤로</PixBtn>
      </div>
      <div style={{ animation:'float 2s ease-in-out infinite', marginTop:8 }}>
        <Px s={SP.dove} scale={sc(4)}/>
      </div>
    </div>
  );

  if (phase==='result') return (
    <div style={{ ...FULL, background:'#0a1a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <Stars/>
      <div style={{ color:'#FFD700', fontSize:'18px', animation:'popIn 0.5s ease-out' }}>🕊️ 날아갔어요!</div>
      <Panel style={{ maxWidth:360, width:'calc(100% - 32px)', textAlign:'center' }}>
        <div style={{ color:'#4CAF50', fontSize:'9px', lineHeight:2 }}>
          홍수가 완전히 끝났어요!<br/>
          비둘기가 올리브 잎을 물고 왔어요 🌿<br/><br/>
          <span style={{color:'#FFD700'}}>모든 미션 완료! 🎉</span>
        </div>
      </Panel>
      <PixBtn onClick={onComplete} color="#4CAF50" style={{ fontSize:'12px' }}>
        🎂 생일 메시지 보기!
      </PixBtn>
    </div>
  );

  const bgCol = phase==='unlocking' ? '#0a2a0a' : '#0a1a0a';

  return (
    <div style={{ ...FULL, background:bgCol, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, transition:'background 1s' }}>
      <Stars/>
      {phase!=='unlocking' && (
        <>
          <div style={{ color:'#FFD700', fontSize:'14px', textShadow:'2px 2px 0 #000' }}>🕊️ 비둘기 자물쇠</div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ animation: phase==='playing' ? 'float 2s ease-in-out infinite' : undefined }}>
              <Px s={SP.dove} scale={IS_MOBILE ? 4 : 5}/>
            </div>
            <Px s={SP.cage_open} scale={sc(4)}/>
            <Px s={SP.lock} scale={sc(4)}/>
          </div>

          <Panel style={{ textAlign:'center', width:'calc(100% - 32px)', maxWidth:320, animation: shake ? 'shake 0.5s ease-in-out' : undefined }}>
            <div style={{ color:'#90CAF9', fontSize:'9px', marginBottom:12 }}>생일 4자리를 입력하세요</div>
            <div style={{ display:'flex', gap:IS_MOBILE ? 10 : 8, justifyContent:'center', marginBottom:12 }}>
              {digits.map((d,i)=>(
                <input
                  key={i}
                  ref={inputRefs[i]}
                  inputMode="numeric"
                  type="tel"
                  maxLength={1}
                  value={d}
                  onChange={e=>handleDigit(i,e.target.value)}
                  onKeyDown={e=>handleKey(i,e)}
                  style={{
                    width:dW, height:dH, textAlign:'center', fontSize:dFS,
                    fontFamily:"'Press Start 2P',monospace",
                    background:'#0d0d2e', color:'#FFD700',
                    border:`3px solid ${d ? '#FFD700':'#5D4037'}`,
                    outline:'none', letterSpacing:0,
                    WebkitAppearance:'none', borderRadius:0,
                    touchAction:'manipulation',
                    boxSizing:'border-box',
                  }}
                />
              ))}
            </div>
            {error && <div style={{ color:'#EF5350', fontSize:'8px', marginBottom:10 }}>{error}</div>}
            <PixBtn onClick={tryUnlock} color="#1B5E20" style={{ width:'100%' }}>
              🔓 자물쇠 열기
            </PixBtn>
          </Panel>
          <PixBtn onClick={onBack} color="#546E7A">← 메인으로</PixBtn>
        </>
      )}

      {phase==='unlocking' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div style={{ color:'#FFD700', fontSize:'14px', animation:'blink 0.5s ease-in-out infinite' }}>
            🔓 잠금 해제 중...
          </div>
          <div style={{ animation:`doveFly 2s ease-out ${dovePos>2?'forwards':'none'}`, opacity: dovePos>4 ? 0 : 1 }}>
            <Px s={SP.dove} scale={IS_MOBILE ? 5 : 6}/>
          </div>
          {dovePos>0 && <div style={{ color:'#81C784', fontSize:'9px' }}>🕊️ 비둘기가 날아가요!</div>}
          {dovePos>3 && (
            <div style={{ animation:'popIn 0.5s ease-out' }}>
              <Px s={SP.rainbow} scale={IS_MOBILE ? 2 : 3}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE: ENDING
// ═══════════════════════════════════════════════════════════════
function EndingScene({ onBack }: { onBack:()=>void }) {
  const [step, setStep] = useState(0);

  useEffect(()=>{
    playBg('ending');
    const t1 = setTimeout(()=>{ sfx.birthday(); }, 400);
    const t2 = setTimeout(()=>setStep(1), 1200);
    const t3 = setTimeout(()=>setStep(2), 2400);
    const t4 = setTimeout(()=>setStep(3), 3600);
    const t5 = setTimeout(()=>setStep(4), 4800);
    return ()=>{ stopBg(); [t1,t2,t3,t4,t5].forEach(clearTimeout); };
  },[]);

  const confetti = Array.from({length:16},(_,i)=>({
    x:(i*47+11)%95, delay:i*0.2,
    color:['#FFD700','#FF69B4','#42A5F5','#4CAF50','#FF9800','#CE93D8'][i%6],
    dur:2+(i%3)*0.5,
  }));

  return (
    <div style={{
      ...FULL,
      background:'#08041a',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
      overflowY:'auto', overflowX:'hidden',
      paddingTop: IS_MOBILE ? 16 : 20,
      paddingBottom: `max(24px, env(safe-area-inset-bottom, 24px))`,
      paddingLeft:16, paddingRight:16, boxSizing:'border-box',
    }}>
      <Stars n={25}/>

      {/* Confetti */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        {confetti.map((c,i)=>(
          <div key={i} style={{
            position:'absolute', left:`${c.x}%`, top:0,
            width:6, height:12, background:c.color,
            animation:`rainFall ${c.dur}s linear ${c.delay}s infinite`,
          }}/>
        ))}
      </div>

      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', gap:IS_MOBILE ? 14 : 18, maxWidth:420, width:'100%' }}>

        {step>=1 && (
          <div style={{ animation:'popIn 0.6s ease-out' }}>
            <Px s={SP.rainbow} scale={IS_MOBILE ? 2 : 3}/>
          </div>
        )}

        <div style={{ textAlign:'center', animation:'slideIn 0.8s ease-out' }}>
          <div style={{ fontSize: IS_MOBILE ? '16px' : '22px', color:'#FFD700', textShadow:'4px 4px 0 #000', marginBottom:8, animation:'celebrate 2s ease-in-out infinite' }}>
            🎂 생일 축하해요! 🎂
          </div>
          <div style={{ fontSize:'9px', color:'#FFB6C1' }}>
            Happy Birthday, 한지유님! 🎉
          </div>
        </div>

        {step>=1 && (
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', animation:'popIn 0.5s ease-out' }}>
            <div style={{ animation:'float 2s ease-in-out infinite' }}>
              <Px s={SP.jiyu} scale={sc(3)}/>
            </div>
            <div style={{ animation:'float 2.5s ease-in-out 0.3s infinite' }}>
              <Px s={SP.dove} scale={sc(4)}/>
            </div>
            <div style={{ animation:'float 3s ease-in-out 0.6s infinite' }}>
              <Px s={SP.noah} scale={sc(3)}/>
            </div>
          </div>
        )}

        {step>=1 && (
          <div style={{ animation:'arkBob 4s ease-in-out infinite' }}>
            <Px s={SP.ark} scale={IS_MOBILE ? 1 : 2}/>
          </div>
        )}

        {step>=2 && (
          <Panel style={{ textAlign:'center', animation:'popIn 0.6s ease-out', width:'100%' }}>
            <div style={{ color:'#FFD700', fontSize: IS_MOBILE ? '11px' : '13px', lineHeight:2.2, marginBottom:10 }}>
              "내가 너와 함께 있어<br/>
              네게 복을 주리라."
            </div>
            <div style={{ color:'#90CAF9', fontSize:'9px' }}>
              — 창세기 26:24 —
            </div>
          </Panel>
        )}

        {step>=3 && (
          <Panel style={{ textAlign:'center', background:'#1a0a30', animation:'slideIn 0.6s ease-out', width:'100%' }}>
            <div style={{ color:'#FFB6C1', fontSize:'9px', lineHeight:2.2 }}>
              지유야, 생일 축하해! 🎉<br/>
              하나님이 항상 너와 함께하시고<br/>
              넘치는 복을 부어주시길 기도해 🙏<br/><br/>
              <span style={{color:'#FFD700'}}>오늘 하루도, 앞으로의 모든 날도<br/>
              축복이 가득하길! ✨</span>
            </div>
          </Panel>
        )}

        {step>=4 && (
          <div style={{ display:'flex', gap:8, animation:'popIn 0.5s ease-out' }}>
            {[0,1,2,3,4].map(i=>(
              <div key={i} style={{ animation:`float ${2+i*0.3}s ease-in-out ${i*0.2}s infinite` }}>
                <Px s={SP.star} scale={sc(3)}/>
              </div>
            ))}
          </div>
        )}

        {step>=4 && (
          <div style={{ display:'flex', gap:8, animation:'popIn 0.7s ease-out' }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ animation:`heartBeat ${1+i*0.2}s ease-in-out infinite` }}>
                <Px s={SP.heart} scale={sc(3)}/>
              </div>
            ))}
          </div>
        )}

        {step>=3 && (
          <PixBtn onClick={onBack} color="#546E7A">
            ← 다시 처음으로
          </PixBtn>
        )}
      </div>
    </div>
  );
}
