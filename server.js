const http = require('http');
const { Server } = require('socket.io');
const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('NEON RIFT LAN server online');
});
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] }, maxHttpBufferSize: 1e5 });
const rooms = new Map();
const makeCode = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code; do { code = Array.from({length:5},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); } while (rooms.has(code)); return code; };
function publicRoom(room) { return { code: room.code, hostId: room.hostId, players: [...room.players.values()].map(p=>({id:p.id,name:p.name,host:p.id===room.hostId})), started: room.started, level: room.level, difficulty: room.difficulty }; }
function broadcastRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function leave(socket) {
  const code = socket.data.roomCode; if (!code) return;
  const room = rooms.get(code); socket.leave(code); socket.data.roomCode = null;
  if (!room) return;
  room.players.delete(socket.id);
  if (!room.players.size) { rooms.delete(code); return; }
  if (room.hostId === socket.id) { room.hostId = room.players.keys().next().value; room.started = false; io.to(code).emit('room:notice', 'O anfitrião saiu. Uma nova pessoa assumiu a hospedagem; crie uma nova partida.'); }
  broadcastRoom(room);
}
io.on('connection', socket => {
  socket.on('room:create', ({name}={}) => {
    leave(socket); const code = makeCode(); const room = {code,hostId:socket.id,players:new Map(),started:false,level:0,difficulty:1};
    room.players.set(socket.id,{id:socket.id,name:String(name||'Anfitrião').slice(0,18),state:null}); rooms.set(code,room); socket.join(code); socket.data.roomCode=code;
    socket.emit('room:created', publicRoom(room)); broadcastRoom(room);
  });
  socket.on('room:join', ({code,name}={}) => {
    code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''); const room=rooms.get(code);
    if (!room) return socket.emit('room:error','Sala não encontrada. Confira o IP do anfitrião e o código.');
    if (room.players.size>=8) return socket.emit('room:error','Sala cheia: o limite é de 8 jogadores.');
    if (room.started) return socket.emit('room:error','A partida já começou. Aguarde a próxima sala.');
    leave(socket); room.players.set(socket.id,{id:socket.id,name:String(name||'Jogador').slice(0,18),state:null}); socket.join(code); socket.data.roomCode=code;
    socket.emit('room:joined',publicRoom(room)); broadcastRoom(room);
  });
  socket.on('room:start', ({level,difficulty}={}) => {
    const room=rooms.get(socket.data.roomCode); if(!room||room.hostId!==socket.id) return;
    room.started=true; room.level=Math.max(0,Math.min(11,Number(level)||0)); room.difficulty=Math.max(0,Math.min(2,Number(difficulty)||0));
    io.to(room.code).emit('game:start',{level:room.level,difficulty:room.difficulty,hostId:room.hostId}); broadcastRoom(room);
  });
  socket.on('player:state', state => {
    const room=rooms.get(socket.data.roomCode); if(!room||!room.started||!room.players.has(socket.id)||!state) return;
    const safe={x:num(state.x),y:num(state.y),z:num(state.z),yaw:num(state.yaw),pit:num(state.pit),hp:Math.max(0,Math.min(200,num(state.hp))),weapon:Math.max(0,Math.min(20,Math.floor(num(state.weapon)))),alive:!!state.alive};
    room.players.get(socket.id).state=safe; socket.to(room.code).emit('player:state',{id:socket.id,name:room.players.get(socket.id).name,...safe});
  });
  socket.on('game:event', data => { const room=rooms.get(socket.data.roomCode); if(room&&room.started) socket.to(room.code).emit('game:event',{from:socket.id,data}); });
  socket.on('disconnect',()=>leave(socket));
});
function num(v){v=Number(v);return Number.isFinite(v)?Math.max(-10000,Math.min(10000,v)):0;}
server.listen(PORT,'0.0.0.0',()=>console.log(`NEON RIFT LAN ativo na porta ${PORT}. Abra o jogo e conecte pelo IP desta máquina.`));
