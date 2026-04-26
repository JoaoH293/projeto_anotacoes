let editores = {}; // Armazena as instâncias do Quill para cada campo
let tipoAtual = '';

const configuracaoCampos = {
    estudo: [
        "Qual versículo me marcou?", "O que diz esses versículos?", "Qual o contexto em que eles se encontram?",
        "Qual o problema/necessidade que a passagem aborda?", "No que eu me identifiquei nesse texto?",
        "O que esse texto revela sobre o caráter de Deus?", "Como posso aplicar isso?"
    ],
    devocional: ["Quais são os versículos?", "O que diz cada versículo?", "Desenvolvimento"],
    sermao: ["Quais são os versículos?", "Qual o contexto de cada versículo?", "O que diz cada versículo?", "Desenvolvimento"]
};

const toolbarOptions = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
];

function gerarFormulario(tipo) {
    tipoAtual = tipo;
    const container = document.getElementById('campos-dinamicos');
    const areaForm = document.getElementById('area-formulario');
    container.innerHTML = '';
    editores = {}; 
    areaForm.style.display = 'block';

    configuracaoCampos[tipo].forEach((pergunta, index) => {
        // Criar Label
        const label = document.createElement('label');
        label.className = 'label-pergunta';
        label.innerText = pergunta;
        container.appendChild(label);

        // Criar Div para o Editor
        const editorDiv = document.createElement('div');
        editorDiv.id = `editor-${index}`;
        editorDiv.className = 'editor-campo';
        container.appendChild(editorDiv);

        // Inicializar Quill no campo
        const quill = new Quill(`#editor-${index}`, {
            modules: { toolbar: toolbarOptions },
            theme: 'snow'
        });
        
        editores[pergunta] = quill;
    });
    window.scrollTo(0, areaForm.offsetTop - 20);
}

function salvarNota() {
    const titulo = document.getElementById('tituloNota').value;
    if(!titulo) return alert("Digite um título!");

    let dadosRespostas = [];
    for (let pergunta in editores) {
        dadosRespostas.push({
            pergunta: pergunta,
            resposta: editores[pergunta].root.innerHTML
        });
    }

    const novaNota = {
        id: Date.now(),
        tipo: tipoAtual,
        titulo: titulo,
        respostas: dadosRespostas,
        data: new Date().toLocaleString()
    };

    let notas = JSON.parse(localStorage.getItem('minhasAnotacoes')) || [];
    notas.push(novaNota);
    localStorage.setItem('minhasAnotacoes', JSON.stringify(notas));

    alert("Salvo com sucesso!");
    location.reload(); // Recarrega para mostrar na lista
}

function carregarHistorico() {
    const lista = document.getElementById('lista-anotacoes');
    let notas = JSON.parse(localStorage.getItem('minhasAnotacoes')) || [];

    if(notas.length === 0) {
        lista.innerHTML = '<p>Nenhuma anotação encontrada.</p>';
        return;
    }

    notas.reverse().forEach(nota => {
        let htmlNota = `<div class="nota-salva">
            <h3>${nota.titulo} <small>(${nota.tipo} - ${nota.data})</small></h3>`;
        
        nota.respostas.forEach(r => {
            htmlNota += `<div class="item-pergunta"><strong>${r.pergunta}</strong><br>${r.resposta}</div>`;
        });

        htmlNota += `</div>`;
        lista.innerHTML += htmlNota;
    });
}

function gerarPDF() {
    const titulo = document.getElementById('tituloNota').value || 'Anotação';
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '30px';

    tempDiv.innerHTML = `<h1>${titulo}</h1><p>Tipo: ${tipoAtual}</p><hr>`;
    
    for (let pergunta in editores) {
        tempDiv.innerHTML += `<p><strong>${pergunta}</strong></p><div>${editores[pergunta].root.innerHTML}</div><br>`;
    }

    const opt = {
        margin: 10,
        filename: `${titulo}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempDiv).save();
}

window.onload = carregarHistorico;
