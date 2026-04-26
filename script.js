// Configuração da barra de ferramentas do Quill
var toolbarOptions = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
];

var quill = new Quill('#editor-container', {
    modules: { toolbar: toolbarOptions },
    theme: 'snow',
    placeholder: 'Sua anotação aparecerá aqui...'
});

// Templates das perguntas
const templates = {
    estudo: `
        <h3>Estudo Bíblico</h3>
        <p><strong>Qual versículo me marcou?</strong><br><br></p>
        <p><strong>O que diz esses versículos?</strong><br><br></p>
        <p><strong>Qual o contexto em que eles se encontram?</strong><br><br></p>
        <p><strong>Qual o problema/necessidade que a passagem aborda?</strong><br><br></p>
        <p><strong>No que eu me identifiquei nesse texto?</strong><br><br></p>
        <p><strong>O que esse texto revela sobre o caráter de Deus?</strong><br><br></p>
        <p><strong>Como posso aplicar isso?</strong><br><br></p>
    `,
    devocional: `
        <h3>Devocional</h3>
        <p><strong>Quais são os versículos?</strong><br><br></p>
        <p><strong>O que diz cada versículo?</strong><br><br></p>
        <p><strong>Desenvolvimento:</strong><br><br></p>
    `,
    sermao: `
        <h3>Sermão</h3>
        <p><strong>Quais são os versículos?</strong><br><br></p>
        <p><strong>Qual o contexto de cada versículo?</strong><br><br></p>
        <p><strong>O que diz cada versículo?</strong><br><br></p>
        <p><strong>Desenvolvimento:</strong><br><br></p>
    `
};

// Carrega o template no editor
function carregarTemplate(tipo) {
    quill.root.innerHTML = templates[tipo];
    document.getElementById('tituloNota').focus();
}

// Gerar PDF mantendo as formatações
function gerarPDF() {
    const titulo = document.getElementById('tituloNota').value || 'Anotacao';
    const conteudoHTML = quill.root.innerHTML;

    const elementoTemporario = document.createElement('div');
    elementoTemporario.innerHTML = `<h1>${titulo}</h1>${conteudoHTML}`;
    elementoTemporario.style.padding = '20px';
    elementoTemporario.style.fontFamily = 'sans-serif';

    const opt = {
        margin:       10,
        filename:     `${titulo}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(elementoTemporario).save();
}

// Salvar no LocalStorage (Memória do Navegador)
function salvarNota() {
    const titulo = document.getElementById('tituloNota').value;
    const conteudo = quill.root.innerHTML;

    if(!titulo || titulo.trim() === "") {
        alert("Por favor, dê um título ou referência à anotação.");
        return;
    }

    // Puxa as notas que já existem (se houver), ou cria uma lista vazia
    let notasSalvas = JSON.parse(localStorage.getItem('minhasAnotacoes')) || [];

    // Cria a nova nota
    const novaNota = {
        id: Date.now(), // Gera um ID único baseado na data/hora
        titulo: titulo,
        conteudo: conteudo,
        data: new Date().toISOString()
    };

    // Adiciona a nota na lista e salva de volta no navegador
    notasSalvas.push(novaNota);
    localStorage.setItem('minhasAnotacoes', JSON.stringify(notasSalvas));
    
    alert("Anotação salva com sucesso!");
    
    // Limpa os campos
    document.getElementById('tituloNota').value = '';
    quill.root.innerHTML = '';
    
    // Atualiza a tela
    carregarAnotacoes(); 
}

// Carregar notas do LocalStorage para a tela
function carregarAnotacoes() {
    const lista = document.getElementById('lista-anotacoes');
    let notasSalvas = JSON.parse(localStorage.getItem('minhasAnotacoes')) || [];
    
    lista.innerHTML = '';

    if (notasSalvas.length === 0) {
        lista.innerHTML = '<p style="text-align:center; color:#777;">Nenhuma anotação salva ainda.</p>';
        return;
    }

    // Inverte a lista para mostrar as mais recentes primeiro
    notasSalvas.reverse().forEach((nota) => {
        const dataFormatada = new Date(nota.data).toLocaleDateString('pt-BR');
        
        lista.innerHTML += `
            <div class="nota-salva" id="nota-${nota.id}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${nota.titulo} <small style="font-size: 12px; color: #666;">(${dataFormatada})</small></h3>
                    <button onclick="deletarNota(${nota.id})" style="background-color: #ff4757; padding: 5px 10px;">Excluir</button>
                </div>
                <div style="margin-top: 10px;">${nota.conteudo}</div>
            </div>
        `;
    });
}

// Função bônus: Deletar nota
function deletarNota(id) {
    if(confirm("Tem certeza que deseja excluir esta anotação?")) {
        let notasSalvas = JSON.parse(localStorage.getItem('minhasAnotacoes')) || [];
        notasSalvas = notasSalvas.filter(nota => nota.id !== id);
        localStorage.setItem('minhasAnotacoes', JSON.stringify(notasSalvas));
        carregarAnotacoes();
    }
}

// Carrega as notas assim que a página abre
window.onload = carregarAnotacoes;