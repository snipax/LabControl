import * as SQLite from 'expo-sqlite';

// Abre ou cria o arquivo físico do banco de dados no aparelho
const db = SQLite.openDatabaseSync('labcontrol.db');

export const initDB = () => {
  // Ativa suporte a chaves estrangeiras relacionais no SQLite
  db.execSync('PRAGMA foreign_keys = ON;');

  // Criação das tabelas do MVP (Equipamentos 1:N Movimentações)
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
      tipo TEXT NOT NULL,
      responsavel TEXT NOT NULL,
      observacao TEXT,
      latitude REAL,
      longitude REAL,
      foto_vistoria_uri TEXT,
      data_hora TEXT NOT NULL,
      FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id) ON DELETE CASCADE
    );
  `);

  // Popula dados iniciais apenas se o banco estiver vazio na primeira execução
  const countResult = db.getFirstSync('SELECT COUNT(*) as total FROM equipamentos;');
  if (countResult && countResult.total === 0) {
    seedInitialData();
  }
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
        'Edilson Alves (RA: 114093)',
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
        'Edilson Alves (RA: 114093)',
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
        'Técnico de Laboratório',
        'Canal 1 não estabiliza tensão acima de 12V. Encaminhado para troca do regulador.',
        -22.5648,
        -47.4019,
        null,
        new Date().toLocaleString('pt-BR'),
      ]
    );
  });
};

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

  return { total, disponiveis, emprestados, manutencao };
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
  tipo,
  responsavel,
  observacao,
  latitude,
  longitude,
  foto_vistoria_uri,
}) => {
  let novoStatus = 'DISPONIVEL';
  let novoResponsavel = null;

  if (tipo === 'EMPRESTIMO') {
    novoStatus = 'EMPRESTADO';
    novoResponsavel = responsavel.trim();
  } else if (tipo === 'MANUTENCAO') {
    novoStatus = 'MANUTENCAO';
    novoResponsavel = responsavel.trim() || 'Equipe de Manutenção';
  }

  const dataHoraAtual = new Date().toLocaleString('pt-BR');

  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE equipamentos SET status = ?, responsavel_atual = ? WHERE id = ?;`,
      [novoStatus, novoResponsavel, equipamento_id]
    );

    db.runSync(
      `INSERT INTO movimentacoes (equipamento_id, tipo, responsavel, observacao, latitude, longitude, foto_vistoria_uri, data_hora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        equipamento_id,
        tipo,
        novoResponsavel || 'Devolvido ao Laboratório',
        observacao.trim() || 'Vistoria registrada sem observações adicionais.',
        latitude,
        longitude,
        foto_vistoria_uri,
        dataHoraAtual,
      ]
    );
  });
};

export const getMovimentacoes = () => {
  return db.getAllSync(`
    SELECT 
      m.*,
      e.nome as equipamento_nome,
      e.codigo_qr as equipamento_qr
    FROM movimentacoes m
    INNER JOIN equipamentos e ON e.id = m.equipamento_id
    ORDER BY m.id DESC;
  `);
};

export const deleteMovimentacao = (id) => {
  return db.runSync('DELETE FROM movimentacoes WHERE id = ?;', [id]);
};