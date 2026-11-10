import * as SQLite from 'expo-sqlite';

// Abre ou cria o arquivo físico do banco de dados no aparelho
const db = SQLite.openDatabaseSync('labcontrol.db');

// Função auxiliar que verifica no SQLite se uma coluna existe e a cria caso falte
const ensureColumnExists = (tableName, columnName, columnDef) => {
    try {
        const columns = db.getAllSync(`PRAGMA table_info(${tableName});`);
        const exists = columns.some((col) => col.name === columnName);
        if (!exists) {
            db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
        }
    } catch (e) {
        console.log(`Erro ao verificar coluna ${columnName} em ${tableName}:`, e.message);
    }
};

export const initDB = () => {
    // Ativa suporte a chaves estrangeiras relacionais no SQLite
    db.execSync('PRAGMA foreign_keys = ON;');

    // Criação das 3 tabelas relacionais (Equipamentos, Usuarios e Movimentacoes)
    db.execSync(`
    CREATE TABLE IF NOT EXISTS equipamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_qr TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      bancada_sala TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DISPONIVEL',
      responsavel_atual TEXT,
      foto_uri TEXT,
      prazo_devolucao TEXT,
      notificacao_id TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ra_matricula TEXT NOT NULL UNIQUE,
      perfil TEXT NOT NULL DEFAULT 'ALUNO',
      curso_setor TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipamento_id INTEGER NOT NULL,
      usuario_id INTEGER,
      tipo TEXT NOT NULL,
      responsavel TEXT NOT NULL,
      observacao TEXT,
      latitude REAL,
      longitude REAL,
      foto_vistoria_uri TEXT,
      data_hora TEXT NOT NULL,
      prazo_devolucao TEXT,
      FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
    );
  `);

    // Garante que bancos criados nas versões anteriores recebam as colunas novas sem erro
    ensureColumnExists('equipamentos', 'prazo_devolucao', 'TEXT');
    ensureColumnExists('equipamentos', 'notificacao_id', 'TEXT');
    ensureColumnExists('movimentacoes', 'usuario_id', 'INTEGER');
    ensureColumnExists('movimentacoes', 'prazo_devolucao', 'TEXT');

    // Popula equipamentos iniciais se a tabela equipamentos estiver vazia
    const countEquip = db.getFirstSync('SELECT COUNT(*) as total FROM equipamentos;');
    if (countEquip && countEquip.total === 0) {
        seedInitialData();
    }

    // Popula usuários iniciais se a tabela usuarios estiver vazia
    const countUsers = db.getFirstSync('SELECT COUNT(*) as total FROM usuarios;');
    if (countUsers && countUsers.total === 0) {
        seedInitialUsers();
    }
};

const seedInitialUsers = () => {
    db.withTransactionSync(() => {
        db.runSync(
            `INSERT INTO usuarios (nome, ra_matricula, perfil, curso_setor) VALUES (?, ?, ?, ?);`,
            ['Edilson Martins Alves', '114093', 'ALUNO', 'Engenharia de Computação']
        );
        db.runSync(
            `INSERT INTO usuarios (nome, ra_matricula, perfil, curso_setor) VALUES (?, ?, ?, ?);`,
            ['Leonardo Sassaki', '114099', 'ALUNO', 'Engenharia de Computação']
        );
        db.runSync(
            `INSERT INTO usuarios (nome, ra_matricula, perfil, curso_setor) VALUES (?, ?, ?, ?);`,
            ['Carlos Mendes', 'TEC-01', 'TECNICO', 'Laboratório de Hardware e Embarcados']
        );
    });
};

const seedInitialData = () => {
    db.withTransactionSync(() => {
        db.runSync(
            `INSERT INTO equipamentos (codigo_qr, nome, categoria, bancada_sala, status, responsavel_atual, foto_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                'PAT-STM32-001',
                'Kit Dev STM32 Nucleo-F446RE',
                'Microcontrolador',
                'Lab Embarcados - Bancada 02',
                'DISPONIVEL',
                null,
                'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
            ]
        );

        const oscResult = db.runSync(
            `INSERT INTO equipamentos (codigo_qr, nome, categoria, bancada_sala, status, responsavel_atual, foto_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                'PAT-OSC-002',
                'Osciloscópio Digital Tektronix 50MHz',
                'Instrumentação',
                'Lab Eletrônica - Bancada 01',
                'EMPRESTADO',
                'Edilson Martins Alves (RA: 114093)',
                'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80',
            ]
        );

        const fonteResult = db.runSync(
            `INSERT INTO equipamentos (codigo_qr, nome, categoria, bancada_sala, status, responsavel_atual, foto_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                'PAT-FONTE-003',
                'Fonte de Bancada Assimétrica 30V/5A',
                'Alimentação',
                'Lab Hardware - Bancada 05',
                'MANUTENCAO',
                'Setor de Manutenção',
                'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&q=80',
            ]
        );

        db.runSync(
            `INSERT INTO movimentacoes (equipamento_id, tipo, responsavel, observacao, latitude, longitude, foto_vistoria_uri, data_hora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                oscResult.lastInsertRowId,
                'EMPRESTIMO',
                'Edilson Martins Alves (RA: 114093)',
                'Retirado para medição de barramento CAN em bancada.',
                -22.5646,
                -47.4017,
                null,
                new Date().toLocaleString('pt-BR'),
            ]
        );

        db.runSync(
            `INSERT INTO movimentacoes (equipamento_id, tipo, responsavel, observacao, latitude, longitude, foto_vistoria_uri, data_hora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                fonteResult.lastInsertRowId,
                'MANUTENCAO',
                'Carlos Mendes (RA: TEC-01)',
                'Canal 1 não estabiliza tensão acima de 12V. Encaminhado para troca do regulador.',
                -22.5648,
                -47.4019,
                null,
                new Date().toLocaleString('pt-BR'),
            ]
        );
    });
};

// Executa a verificação/migração imediatamente ao carregar o módulo
initDB();

// ============================================================================
// CONSULTAS E OPERAÇÕES DO CRUD DE EQUIPAMENTOS (DAO)
// ============================================================================

export const getDashboardStats = () => {
    const total = db.getFirstSync('SELECT COUNT(*) as count FROM equipamentos;')?.count || 0;
    const disponiveis =
        db.getFirstSync("SELECT COUNT(*) as count FROM equipamentos WHERE status = 'DISPONIVEL';")?.count || 0;
    const emprestados =
        db.getFirstSync("SELECT COUNT(*) as count FROM equipamentos WHERE status = 'EMPRESTADO';")?.count || 0;
    const manutencao =
        db.getFirstSync("SELECT COUNT(*) as count FROM equipamentos WHERE status = 'MANUTENCAO';")?.count || 0;
    const usuarios = db.getFirstSync('SELECT COUNT(*) as count FROM usuarios;')?.count || 0;

    return { total, disponiveis, emprestados, manutencao, usuarios };
};

export const getEquipamentos = (busca = '', filtroStatus = 'TODOS') => {
    let query = 'SELECT * FROM equipamentos WHERE 1=1';
    const params = [];

    if (filtroStatus !== 'TODOS') {
        query += ' AND status = ?';
        params.push(filtroStatus);
    }

    if (busca.trim() !== '') {
        query += ' AND (nome LIKE ? OR codigo_qr LIKE ? OR bancada_sala LIKE ?)';
        const term = `%${busca.trim()}%`;
        params.push(term, term, term);
    }

    query += ' ORDER BY id DESC;';
    return db.getAllSync(query, params);
};

export const getEquipamentoByQr = (codigoQr) => {
    return db.getFirstSync(
        'SELECT * FROM equipamentos WHERE LOWER(codigo_qr) = LOWER(?);',
        [codigoQr.trim()]
    );
};

export const insertEquipamento = ({ codigo_qr, nome, categoria, bancada_sala, foto_uri }) => {
    return db.runSync(
        `INSERT INTO equipamentos (codigo_qr, nome, categoria, bancada_sala, status, responsavel_atual, foto_uri)
     VALUES (?, ?, ?, ?, 'DISPONIVEL', NULL, ?);`,
        [
            codigo_qr.trim(),
            nome.trim(),
            categoria.trim() || 'Geral',
            bancada_sala.trim() || 'Almoxarifado',
            foto_uri || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
        ]
    );
};

export const updateEquipamento = ({ id, codigo_qr, nome, categoria, bancada_sala, foto_uri }) => {
    return db.runSync(
        `UPDATE equipamentos
     SET codigo_qr = ?, nome = ?, categoria = ?, bancada_sala = ?, foto_uri = ?
     WHERE id = ?;`,
        [codigo_qr.trim(), nome.trim(), categoria.trim(), bancada_sala.trim(), foto_uri, id]
    );
};

export const deleteEquipamento = (id) => {
    return db.runSync('DELETE FROM equipamentos WHERE id = ?;', [id]);
};

// ============================================================================
// CONSULTAS E OPERAÇÕES DO CRUD DE USUÁRIOS (ALUNOS / TÉCNICOS)
// ============================================================================

export const getUsuarios = (busca = '', filtroPerfil = 'TODOS') => {
    let query = 'SELECT * FROM usuarios WHERE 1=1';
    const params = [];

    if (filtroPerfil !== 'TODOS') {
        query += ' AND perfil = ?';
        params.push(filtroPerfil);
    }

    if (busca.trim() !== '') {
        query += ' AND (nome LIKE ? OR ra_matricula LIKE ? OR curso_setor LIKE ?)';
        const term = `%${busca.trim()}%`;
        params.push(term, term, term);
    }

    query += ' ORDER BY nome ASC;';
    return db.getAllSync(query, params);
};

export const insertUsuario = ({ nome, ra_matricula, perfil, curso_setor }) => {
    return db.runSync(
        `INSERT INTO usuarios (nome, ra_matricula, perfil, curso_setor)
     VALUES (?, ?, ?, ?);`,
        [
            nome.trim(),
            ra_matricula.trim(),
            perfil || 'ALUNO',
            curso_setor.trim() || 'Engenharia de Computação',
        ]
    );
};

export const updateUsuario = ({ id, nome, ra_matricula, perfil, curso_setor }) => {
    return db.runSync(
        `UPDATE usuarios
     SET nome = ?, ra_matricula = ?, perfil = ?, curso_setor = ?
     WHERE id = ?;`,
        [nome.trim(), ra_matricula.trim(), perfil, curso_setor.trim(), id]
    );
};

export const deleteUsuario = (id) => {
    return db.runSync('DELETE FROM usuarios WHERE id = ?;', [id]);
};

// ============================================================================
// TRANSAÇÃO DE MOVIMENTAÇÃO (ATUALIZA EQUIPAMENTO + INSERE HISTÓRICO)
// ============================================================================

export const registrarMovimentacaoDB = ({
    equipamento_id,
    usuario_id = null,
    tipo,
    responsavel,
    observacao,
    latitude,
    longitude,
    foto_vistoria_uri,
    prazo_devolucao = null,
    notificacao_id = null,
}) => {
    let novoStatus = 'DISPONIVEL';
    let novoResponsavel = null;
    let novoPrazo = null;
    let novaNotificacaoId = null;

    if (tipo === 'EMPRESTIMO') {
        novoStatus = 'EMPRESTADO';
        novoResponsavel = responsavel.trim();
        novoPrazo = prazo_devolucao;
        novaNotificacaoId = notificacao_id;
    } else if (tipo === 'MANUTENCAO') {
        novoStatus = 'MANUTENCAO';
        novoResponsavel = responsavel.trim() || 'Equipe de Manutenção';
    }

    const dataHoraAtual = new Date().toLocaleString('pt-BR');

    db.withTransactionSync(() => {
        db.runSync(
            `UPDATE equipamentos 
       SET status = ?, responsavel_atual = ?, prazo_devolucao = ?, notificacao_id = ? 
       WHERE id = ?;`,
            [novoStatus, novoResponsavel, novoPrazo, novaNotificacaoId, equipamento_id]
        );

        db.runSync(
            `INSERT INTO movimentacoes (equipamento_id, usuario_id, tipo, responsavel, observacao, latitude, longitude, foto_vistoria_uri, data_hora, prazo_devolucao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                equipamento_id,
                usuario_id,
                tipo,
                novoResponsavel || 'Devolvido ao Laboratório',
                observacao.trim() || 'Vistoria registrada sem observações adicionais.',
                latitude,
                longitude,
                foto_vistoria_uri,
                dataHoraAtual,
                novoPrazo,
            ]
        );
    });
};

export const getMovimentacoes = () => {
    return db.getAllSync(`
    SELECT 
      m.*,
      e.nome as equipamento_nome,
      e.codigo_qr as equipamento_qr,
      u.nome as usuario_nome,
      u.ra_matricula as usuario_ra,
      u.perfil as usuario_perfil
    FROM movimentacoes m
    INNER JOIN equipamentos e ON e.id = m.equipamento_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.id DESC;
  `);
};

export const deleteMovimentacao = (id) => {
    return db.runSync('DELETE FROM movimentacoes WHERE id = ?;', [id]);
};