// --- CONFIGURAÇÕES DO EDITOR QUILL ---
const toolbarOptions = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
];

let editores = {}; 
let tipoAtual = '';
let notaSendoEditadaId = null;
let usuarioLogado = null;

// --- CONFIGURAÇÃO DOS CAMPOS POR FUNÇÃO ---
const configuracaoCampos = {
    estudo: [
        "Qual versículo me marcou?", "O que diz esses versículos?", "Qual o contexto em que eles se encontram?",
        "Qual o problema/necessidade que a passagem aborda?", "No que eu me identifiquei nesse texto?",
        "O que esse texto revela sobre o caráter de Deus?", "Como posso aplicar isso?"
    ],
    devocional: ["Quais são os versículos?", "O que diz cada versículo?", "Desenvolvimento"],
    sermao: ["Quais são os versículos?", "Qual o contexto de cada versículo?", "O que diz cada versículo?", "Desenvolvimento"]
};

// --- GESTÃO DE AUTENTICAÇÃO ---
// O objeto window.fb é preenchido pelo script de módulo no index.html
const monitorarAuth = () => {
    if (!window.fb) {
        setTimeout(monitorarAuth, 500);
        return;
    }

    window.fb.onAuthStateChanged(window.fb.auth, (user) => {
        if (user) {
            usuarioLogado = user;
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            document.getElementById('user-display').innerText = `Logado como: ${user.email}`;
            carregarHistoricoNuvem();
        } else {
            usuarioLogado = null;
            document.getElementById('auth-container').style.display = 'block';
            document.getElementById('app-container').style.display = 'none';
        }
    });
};
monitorarAuth();

window.handleAuth = async (tipo) => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!email || !pass) return alert("Preencha e-mail e senha");

    try {
        if(tipo === 'signup') {
            await window.fb.createUserWithEmailAndPassword(window.fb.auth, email, pass);
            alert("Conta criada com sucesso!");
        } else {
            await window.fb.signInWithEmailAndPassword(window.fb.auth, email, pass);
        }
    } catch (e) {
        alert("Erro na autenticação: " + e.message);
    }
};

window.logout = () => window.fb.signOut(window.fb.auth);

// --- LÓGICA DO FORMULÁRIO ---
window.gerarFormulario = function(tipo, dadosPreenchidos = null) {
    tipoAtual = tipo;
    notaSendoEditadaId = dadosPreenchidos ? dadosPreenchidos.id : null;
    
    const container = document.getElementById('campos-dinamicos');
    const areaForm = document.getElementById('area-formulario');
    container.innerHTML = '';
    editores = {}; 
    areaForm.style.display = 'block';

    document.querySelector('.btn-salvar').innerText = notaSendoEditadaId ? "💾 Atualizar na Nuvem" : "💾 Salvar na Nuvem";
    document.getElementById('tituloNota').value = dadosPreenchidos ? dadosPreenchidos.titulo : '';

    configuracaoCampos[tipo].forEach((pergunta, index) => {
        const label = document.createElement('label');
        label.className = 'label-pergunta';
        label.innerText = pergunta;
        container.appendChild(label);

        const editorDiv = document.createElement('div');
        editorDiv.id = `editor-${index}`;
        editorDiv.className = 'editor-campo';
        container.appendChild(editorDiv);

        const quill = new Quill(`#editor-${index}`, {
            modules: { toolbar: toolbarOptions },
            theme: 'snow'
        });
        
        if (dadosPreenchidos) {
            const respostaSalva = dadosPreenchidos.respostas.find(r => r.pergunta === pergunta);
            if (respostaSalva) quill.root.innerHTML = respostaSalva.resposta;
        }
        
        editores[pergunta] = quill;
    });

    window.scrollTo({ top: areaForm.offsetTop - 20, behavior: 'smooth' });
};

// --- SALVAR E CARREGAR (FIREBASE FIRESTORE) ---
window.salvarNota = async function() {
    const titulo = document.getElementById('tituloNota').value;
    if(!titulo) return alert("Dê um título à sua anotação");

    let respostas = [];
    for (let p in editores) {
        respostas.push({
            pergunta: p,
            resposta: editores[p].root.innerHTML
        });
    }

    try {
        if(notaSendoEditadaId) {
            const docRef = window.fb.doc(window.fb.db, "notas", notaSendoEditadaId);
            await window.fb.updateDoc(docRef, { 
                titulo, 
                respostas,
                dataAtualizacao: new Date().toISOString()
            });
            alert("Nota atualizada!");
        } else {
            await window.fb.addDoc(window.fb.collection(window.fb.db, "notas"), {
                uid: usuarioLogado.uid,
                titulo,
                respostas,
                tipo: tipoAtual,
                dataCriacao: new Date().toISOString()
            });
            alert("Salvo na nuvem!");
        }
        document.getElementById('area-formulario').style.display = 'none';
        carregarHistoricoNuvem();
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
};

window.carregarHistoricoNuvem = async function() {
    const lista = document.getElementById('lista-anotacoes');
    lista.innerHTML = '<p>Carregando suas notas...</p>';

    try {
        const q = window.fb.query(
            window.fb.collection(window.fb.db, "notas"), 
            window.fb.where("uid", "==", usuarioLogado.uid),
            window.fb.orderBy("dataCriacao", "desc")
        );
        
        const snap = await window.fb.getDocs(q);
        lista.innerHTML = '';

        if(snap.empty) {
            lista.innerHTML = '<p>Nenhuma anotação encontrada.</p>';
            return;
        }

        snap.forEach(docSnap => {
            const nota = docSnap.data();
            const id = docSnap.id;
            const dataF = new Date(nota.dataCriacao).toLocaleDateString('pt-BR');

            const div = document.createElement('div');
            div.className = 'nota-salva';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <strong style="color:#1a2a6c">${nota.tipo.toUpperCase()}</strong>
                        <h3 style="margin:5px 0">${nota.titulo}</h3>
                        <small>Criado em: ${dataF}</small>
                    </div>
                    <div>
                        <button onclick="prepararEdicao('${id}')" style="background:#f39c12; color:white;">✏️</button>
                        <button onclick="excluirNota('${id}')" style="background:#e74c3c; color:white;">🗑️</button>
                    </div>
                </div>
                <div id="detalhe-${id}" style="display:none; margin-top:15px; border-top:1px solid #ddd; padding-top:10px;">
                    ${nota.respostas.map(r => `<div style="margin-bottom:10px"><strong>${r.pergunta}</strong><br>${r.resposta}</div>`).join('')}
                </div>
                <button onclick="toggleNota('${id}')" id="btn-ver-${id}" style="margin-top:10px; background:#bdc3c7; width:100%">👁️ Ver Detalhes</button>
            `;
            lista.appendChild(div);
        });
    } catch (e) {
        lista.innerHTML = '<p>Erro ao carregar dados. Verifique as regras do banco de dados.</p>';
        console.error(e);
    }
};

// --- FUNÇÕES AUXILIARES ---
window.prepararEdicao = async (id) => {
    const snap = await window.fb.getDocs(window.fb.query(window.fb.collection(window.fb.db, "notas")));
    const docEncontrado = snap.docs.find(d => d.id === id);
    if(docEncontrado) {
        const dados = docEncontrado.data();
        gerarFormulario(dados.tipo, { id, ...dados });
    }
};

window.excluirNota = async (id) => {
    if(confirm("Excluir esta nota permanentemente da nuvem?")) {
        await window.fb.deleteDoc(window.fb.doc(window.fb.db, "notas", id));
        carregarHistoricoNuvem();
    }
};

window.toggleNota = (id) => {
    const el = document.getElementById(`detalhe-${id}`);
    const btn = document.getElementById(`btn-ver-${id}`);
    const aberto = el.style.display === 'block';
    el.style.display = aberto ? 'none' : 'block';
    btn.innerText = aberto ? '👁️ Ver Detalhes' : '🔼 Ocultar';
};

// --- GERAÇÃO DE PDF ---
window.gerarPDF = function() {
    const titulo = document.getElementById('tituloNota').value || 'Anotacao';
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '30px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';

    tempDiv.innerHTML = `<h1 style="color:#1a2a6c">${titulo}</h1><hr>`;
    
    for (let pergunta in editores) {
        tempDiv.innerHTML += `
            <p style="font-weight:bold; color:#444; margin-top:20px;">${pergunta}</p>
            <div style="margin-left:10px;">${editores[pergunta].root.innerHTML}</div>
        `;
    }

    const opt = {
        margin: 10,
        filename: `${titulo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempDiv).save();
};