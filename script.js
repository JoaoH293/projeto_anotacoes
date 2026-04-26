// Configuração do Quill
const toolbarOptions = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
];

let editores = {}; 
let tipoAtual = '';
let notaSendoEditadaId = null;
let usuarioLogado = null;

const configuracaoCampos = {
    estudo: ["Qual versículo me marcou?", "O que diz esses versículos?", "Qual o contexto em que eles se encontram?", "Qual o problema/necessidade que a passagem aborda?", "No que eu me identifiquei nesse texto?", "O que esse texto revela sobre o caráter de Deus?", "Como posso aplicar isso?"],
    devocional: ["Quais são os versículos?", "O que diz cada versículo?", "Desenvolvimento"],
    sermao: ["Quais são os versículos?", "Qual o contexto de cada versículo?", "O que diz cada versículo?", "Desenvolvimento"]
};

// Monitorar Auth
const initApp = () => {
    if (!window.fb) return setTimeout(initApp, 500);

    window.fb.onAuthStateChanged(window.fb.auth, (user) => {
        if (user) {
            usuarioLogado = user;
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            document.getElementById('user-display').innerText = user.email;
            carregarHistorico();
        } else {
            document.getElementById('auth-container').style.display = 'block';
            document.getElementById('app-container').style.display = 'none';
        }
    });
};
initApp();

window.handleAuth = async (tipo) => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if(!email || !pass) return alert("Preencha os campos!");
    try {
        if(tipo === 'signup') await window.fb.createUserWithEmailAndPassword(window.fb.auth, email, pass);
        else await window.fb.signInWithEmailAndPassword(window.fb.auth, email, pass);
    } catch (e) { alert("Erro: " + e.message); }
};

window.logout = () => window.fb.signOut(window.fb.auth);

window.gerarFormulario = function(tipo, dados = null) {
    tipoAtual = tipo;
    notaSendoEditadaId = dados ? dados.id : null;
    const container = document.getElementById('campos-dinamicos');
    const areaForm = document.getElementById('area-formulario');
    container.innerHTML = '';
    editores = {};
    areaForm.style.display = 'block';

    document.getElementById('tituloNota').value = dados ? dados.titulo : '';
    
    configuracaoCampos[tipo].forEach((pergunta, i) => {
        const label = document.createElement('label');
        label.className = 'label-pergunta';
        label.innerText = pergunta;
        container.appendChild(label);

        const div = document.createElement('div');
        div.id = `ed-${i}`;
        div.className = 'editor-campo';
        container.appendChild(div);

        const quill = new Quill(`#ed-${i}`, { modules: { toolbar: toolbarOptions }, theme: 'snow' });
        if(dados) {
            const resp = dados.respostas.find(r => r.pergunta === pergunta);
            if(resp) quill.root.innerHTML = resp.resposta;
        }
        editores[pergunta] = quill;
    });
    window.scrollTo({ top: areaForm.offsetTop, behavior: 'smooth' });
};

window.salvarNota = async function() {
    const titulo = document.getElementById('tituloNota').value;
    if(!titulo) return alert("Título obrigatório");
    let respostas = [];
    for(let p in editores) respostas.push({pergunta: p, resposta: editores[p].root.innerHTML});

    try {
        if(notaSendoEditadaId) {
            await window.fb.updateDoc(window.fb.doc(window.fb.db, "notas", notaSendoEditadaId), { titulo, respostas });
        } else {
            await window.fb.addDoc(window.fb.collection(window.fb.db, "notas"), {
                uid: usuarioLogado.uid, titulo, respostas, tipo: tipoAtual, data: new Date().toISOString()
            });
        }
        alert("Sucesso!");
        location.reload();
    } catch(e) { alert(e.message); }
};

async function carregarHistorico() {
    const lista = document.getElementById('lista-anotacoes');
    const q = window.fb.query(window.fb.collection(window.fb.db, "notas"), window.fb.where("uid", "==", usuarioLogado.uid));
    const snap = await window.fb.getDocs(q);
    lista.innerHTML = '';
    snap.forEach(d => {
        const n = d.data();
        const item = document.createElement('div');
        item.className = 'nota-salva';
        item.style.border = "1px solid #eee";
        item.style.padding = "15px";
        item.style.marginBottom = "10px";
        item.style.borderRadius = "10px";
        item.innerHTML = `<strong>${n.titulo}</strong> (${n.tipo}) <button onclick="prepararEdicao('${d.id}')">✏️</button>`;
        lista.appendChild(item);
    });
}

window.prepararEdicao = async (id) => {
    const docSnap = await window.fb.getDocs(window.fb.query(window.fb.collection(window.fb.db, "notas")));
    const nota = docSnap.docs.find(d => d.id === id);
    if(nota) gerarFormulario(nota.data().tipo, { id: nota.id, ...nota.data() });
};