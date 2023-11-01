const express = require('express');
const bp = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const bcrypt = require("bcrypt");
const port = 3001;

app.use(bp.json());
app.use(express.json());
app.use(bp.urlencoded({ extended: true }));
app.use(cors());

import { Pool, PoolClient } from "pg";

app.get('/', function (_, res) {
    res.send('Aplicação rodando');
    console.log('Aplicação rodando');
})

//ESTABELECIMENTO
app.post('/addEstabelecimento', cadastrarEstabelecimento);
app.put('/editar-usuario-comum-estabelecimento/:idEstabelecimento', editarEstabelecimento);
app.get('/listEstabelecimento', listAllEstabelecimento);
app.get('/Estabelecimento/:idEstabelecimento', getEstabelecimentoById);
app.get('/transacoes-estabelecimento/:idEstabelecimento', getTransacoesEstab);

//PARCEIRO
app.post('/addParceiro', cadastrarParceiro);
app.put('/editar-usuario-comum-parceiro/:idParceiro', editarParceiro);
app.get('/listSemVinculo/:idParceiro', listCarteiraSemVinculo);
app.get('/Parceiro/:idParceiro', getParceiroById);
app.get('/listCarteira/:idParceiro', listCarteiraDoParceiroLogado);
app.get('/transacoes-parceiro/:idParceiro', getTransacoesParceiro);
app.get('/creditos-contratados/:idParceiro', getCreditosContratadosParceiro);

//ADMINISTRADOR
app.get('/listAdministrador', listAllAdministrador);
app.get('/read-by-id-to-edit-admin/:razaoSocial/:tipo', SelectToEditAdmin)
app.put('/editar-usuario-comum-parceiro-by-admin/:razaoSocial/:tipoUsuario', editarAdmin)
app.get('/verifica-email/:emailEDIT', verificaEmail)
app.delete('/deletar-users/:razaoSocial/:tipoUsuario', DeletarUsers)
//addAdmin é pra ser usado apenas internamente, não terá conexão com front
app.post('/addAdmin', addAdmin)
//LISTAR USUARIOS (nome, tipo e id)
app.get('/listarusuarios', getUsers);

//FUNCIONALIDADES
app.post('/enviarToken', enviarToken);
app.post('/VerificarToken', verificarToken);
app.get('/read-by-id-to-edit/:id/:tipo', SelectToEdit);
app.put('/editSenhaRec/:idUser/:tipo', editarSenhaRec);
app.put('/transacaoParceiroEstab/:idParceiro', transacaoParceiroEstab);
app.post('/transacaoGreenneatParc/:idParceiro', transacaoGreenneatParc);
app.post('/login', login2)

//Listar Precos
app.get('/listPreco', listAllPreco);
app.put('/editar-preco/:idPreco', editarPreco);

app.post('/vincular', vincularCarteira)
app.post('/insertAcaoTransacoes', insertAcaoTransacoes)
app.get('/admTransacoes', getAllTransAdm);
app.get('/getRequisicoesAprovar', getRequisicoes);
app.get('/getRequisicoesRecusadas', getRequisicoesRecusadas)
app.put('/aprovado/:idAcao/:idParceiro/:valor', aprovarRequisicao);
app.put('/recusado/:idAcao', recusarRequisicao);

// DASHBOARD
app.get('/parceirosMaisCreditosDoados', listParceirosMaisGastaram)
app.get('/estabelecimentosMaisCreditosDoados', listEstabelecimentoMaisGastaram)
app.get('/regiaoParceiroMaisCedido', listRegioesParceirosMaisGastaram)
app.get('/regiaoEstabMaisRecebeu', listRegioesEstabMaisReceberam)
app.get('/regiaoEstabMaisOleoDescarte', listRegioesEstabMaisOleoDescarte)

//COMPARADOR
app.get('/selectComparador/:regiao', selectComparador)

//LOGIN
app.post('/login', login2);

//CONEXÃO BANCO
const DB = new Pool({
    connectionString: "postgres://yephqbaq:LBiulBYFI5wETIVSl8uENQwJUNnrN0Ln@isabelle.db.elephantsql.com/yephqbaq"
    // user: 'postgres',       //user PostgreSQL padrão = postgres
    // host: 'localhost',
    // database: 'API',
    // password: '',
    // port: 5432             //port PostgreSQL padrão = 5432
});

let connectionDB: PoolClient;

DB.connect().then(conn => {
    connectionDB = conn;
    app.listen(port, () => {
        console.log(`Servidor inicializado em http://localhost:${port}/`);
    });
});

const jwtSecret = '779568';

//Validação e Login no Sistema
async function login2(req, res) {
    const { email } = req.body;
    const { password } = req.body;

    try {
        const SQL1 = `
    SELECT 
        *
    FROM  
        Administradores
    WHERE 
        administrador_email = '${email}'
    `
        const SQL2 = `
    SELECT
        *
    FROM 
        Estabelecimentos
    WHERE
        estabelecimento_email = '${email}'
    `
        const SQL3 = `
    SELECT
        *
    FROM
        Parceiros
    WHERE
        parceiro_email = '${email}'
    `
        const adms = await connectionDB.query(SQL1);
        const estabelecimentos = await connectionDB.query(SQL2);
        const parceiros = await connectionDB.query(SQL3);

        if (adms.rowCount === 1) {
            if (await bcrypt.compare(password, adms.rows[0].administrador_senha)) {
                res.send({
                    msg: "Administrador logado com sucesso.",
                    idAdministrador: adms.rows[0].administrador_id,
                })
            } else {
                res.send({ msg: "Senha incorreta" })
            }
        } else if (estabelecimentos.rowCount === 1) {
            if (await bcrypt.compare(password, estabelecimentos.rows[0].estabelecimento_senha)) {
                res.send({
                    msg: "Estabelecimento logado com sucesso.",
                    idEstabelecimento: estabelecimentos.rows[0].estabelecimento_id,
                })
            } else {
                res.send({ msg: "Senha incorreta" })
            }
        } else if (parceiros.rowCount === 1) {
            if (await bcrypt.compare(password, parceiros.rows[0].parceiro_senha)) {
                res.send({
                    msg: "Parceiro logado com sucesso.",
                    idParceiro: parceiros.rows[0].parceiro_id,
                })
            } else {
                res.send({ msg: "Senha incorreta" })
            }
        } else if (adms.rowCount === 0 && estabelecimentos.rowCount === 0 && parceiros.rowCount === 0) {
            res.send({
                msg: "Usuário não encontrado"
            })
        }
    } catch (error) {
        console.error("Erro", error);
        res.status(500).send({ msg: "Usuário não encontrado" });
    }


}

async function checkEmailParceiro(email) {
    const client = await DB.connect(); // Acquire a client from the pool

    try {
        const result = await client.query(`SELECT * FROM parceiros WHERE parceiro_email = '${email}'`);

        if (result.rows.length > 0) {
            // Email is already in use
            return true;
        } else {
            // Email is available
            return false;
        }
    } catch (error) {
        console.error('Error checking email:', error);
        throw error;
    } finally {
        client.release(); // Release the client back to the pool
    }
}

app.post('/checkEmailParceiro', async (req, res) => {
    const { email } = req.body;
    try {
        const emailInUse = await checkEmailParceiro(email);

        if (emailInUse) {
            res.status(409).json({ message: 'Email already in use' });
        } else {
            res.status(200).json({ message: 'Email available' });
        }
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

async function checkEmailEstabelecimento(email) {
    const client = await DB.connect(); // Acquire a client from the pool

    try {
        const result = await client.query(`SELECT * FROM estabelecimentos WHERE estabelecimento_email = '${email}'`);

        if (result.rows.length > 0) {
            // Email is already in use
            return true;
        } else {
            // Email is available
            return false;
        }
    } catch (error) {
        console.error('Error checking email:', error);
        throw error;
    } finally {
        client.release(); // Release the client back to the pool
    }
}

app.post('/checkEmailEstabelecimento', async (req, res) => {
    const { email } = req.body;
    try {
        const emailInUse = await checkEmailEstabelecimento(email);

        if (emailInUse) {
            res.status(409).json({ message: 'Email already in use' });
        } else {
            res.status(200).json({ message: 'Email available' });
        }
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


//CRUD ESTABELECIMENTO
//Função para verificar se já tem cadastrado o cnpj
async function existeEstabelecimento(cnpj) {
    const res = await connectionDB.query(`
        SELECT
            *
        FROM
            Estabelecimentos
        WHERE
        estabelecimento_cnpj_cpf  = '${cnpj}'
    `);

    var response = false
    res.rows.forEach(estabelecimento => {
        if (estabelecimento.estabelecimento_cnpj_cpf === cnpj) {
            console.log("Existe um estabelecimento com esse CNPJ/CPF. Digite outro CNPJ/CPF")
            response = true
        }
    });
    return response
}

async function cadastrarEstabelecimento(req, res) {
    const { razao_social, nome_fantasia, cnpj, logradouro, logradouroNumero, bairro, cidade, estado, cep, regiao, telefone, email, tipo, senha } = req.body;
    const existeCNPJ = await existeEstabelecimento(cnpj);
    if (existeCNPJ) {
        res.status(409).send({ msg: "Já existe um estabelecimento com esse CNPJ/CPF." });
    } else {
        try {
            const hashSenha = await bcrypt.hash(senha, 10)
            const SQL = `
                INSERT INTO
                    Estabelecimentos("estabelecimento_razao_social","estabelecimento_nome_fantasia","estabelecimento_cnpj_cpf","estabelecimento_logradouro", "estabelecimento_logradouro_numero","estabelecimento_bairro","estabelecimento_cidade","estabelecimento_estado","estabelecimento_cep", "estabelecimento_regiao","estabelecimento_telefone","estabelecimento_email", "estabelecimento_tipo", "estabelecimento_senha")
                VALUES ('${razao_social}','${nome_fantasia}','${cnpj}','${logradouro}', '${logradouroNumero}','${bairro}','${cidade}','${estado}','${cep}','${regiao}','${telefone}','${email}','${tipo}','${hashSenha}')
            `
            const resultado = await connectionDB.query(SQL);
            res.send({ msg: "Estabelecimento cadastrado com sucesso!" });
        } catch (error) {
            console.error("Erro ao cadastrar estabelecimento:", error);
            res.status(500).send({ msg: "Erro ao cadastrar estabelecimento." });
        }
    }
}

async function DeletarUsers(req, res) {
    const razaoSocial = req.params.razaoSocial
    const tipoUsuario = req.params.tipoUsuario

    if (tipoUsuario === 'Parceiro') {
        let SQL = `DELETE FROM Parceiros WHERE parceiro_razao_social = '${razaoSocial}'`;
        DB.query(SQL, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Deletado')
            }
        })
    } else if (tipoUsuario === 'Estabelecimento') {
        let SQL = `DELETE FROM Estabelecimentos WHERE estabelecimento_razao_social = '${razaoSocial}'`;
        DB.query(SQL, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Deletado')
            }
        })
    } else if (tipoUsuario === 'Administrador') {
        let SQL = `DELETE FROM Administradores WHERE administrador_nome = '${razaoSocial}'`;
        DB.query(SQL, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Deletado')
            }
        })
    }
}


async function editarEstabelecimento(req, res) {
    const idEstabelecimento = req.params.idEstabelecimento;
    const { usuarioDados } = req.body;


    const fieldsToUpdate = [
        `estabelecimento_email = '${usuarioDados.email}'`,
        `estabelecimento_logradouro = '${usuarioDados.logradouro}'`,
        `estabelecimento_logradouro_numero = '${usuarioDados.numero}'`,
        `estabelecimento_bairro = '${usuarioDados.bairro}'`,
        `estabelecimento_cidade = '${usuarioDados.cidade}'`,
        `estabelecimento_estado = '${usuarioDados.estado}'`,
        `estabelecimento_cep = '${usuarioDados.cep}'`,
        `estabelecimento_regiao = '${usuarioDados.regiao}'`
    ];

    if (usuarioDados.senha !== undefined && usuarioDados.senha !== '') {
        const hashSenha = await bcrypt.hash(usuarioDados.senha, 10)
        fieldsToUpdate.push(`estabelecimento_senha = '${hashSenha}'`);
    }

    const updateFieldsStr = fieldsToUpdate.join(', ');

    const SQL = `
        UPDATE 
            Estabelecimentos 
        SET
            ${updateFieldsStr}
        WHERE
            estabelecimento_id = '${idEstabelecimento}'
    `;

    DB.query(SQL, (err, _) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Failed to update estabelecimento data' });
        } else {
            console.log('Editado!');
            res.status(200).json({ message: 'Estabelecimento data updated successfully' });
        }
    });
}



async function listAllEstabelecimento(_, res) {
    console.log("Requisição de listagem de estabelecimento recebida.");
    try {

        const SQL = `
    SELECT 
        *
    FROM 
        Estabelecimentos
    ORDER BY
        estabelecimento_id 
    `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao listar estabelecimento:", error);
        res.status(500).send({ msg: "Erro ao listar estabelecimento." });
    }
}


async function getEstabelecimentoById(req, res) {
    const id = req.params.idEstabelecimento;
    try {

        const SQL1 = `
            SELECT * FROM
                Estabelecimentos
            WHERE
                estabelecimento_id = '${id}'
        `
        const resultado = await connectionDB.query(SQL1);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar estabelecimento:", error);
        res.status(500).send({ msg: "Erro ao buscar estabelecimento." });
    }
}
//CRUD ESTABELECIMENTO

//CRUD PARCEIROS
//Função para verificar se já tem parceiro cadastrado no cnpj
async function existeParceiro(cnpj) {
    const res = await connectionDB.query(`
        SELECT
            *
        FROM
            Parceiros
        WHERE
            parceiro_cnpj_cpf   = '${cnpj}'
    `);

    var response = false
    res.rows.forEach(parceiro => {
        if (parceiro.parceiro_cnpj_cpf === cnpj) {
            console.log("Existe um parceiro com esse CNPJ/CPF. Digite outro CNPJ/CPF")
            response = true
        }
    });
    return response
}

async function cadastrarParceiro(req, res) {
    const { razao_social, nome_fantasia, cnpj, logradouro, logradouroNumero, bairro, cidade, estado, cep, regiao, telefone, cidadesAtende, email, tipo, senha } = req.body;
    const existeCNPJ = await existeParceiro(cnpj);
    if (existeCNPJ) {
        res.status(409).send({ msg: "Já existe um parceiro com esse CNPJ/CPF." });
    } else {
        try {
            const hashSenha = await bcrypt.hash(senha, 10)
            const SQL = `
                INSERT INTO
                    Parceiros("parceiro_razao_social","parceiro_nome_fantasia","parceiro_cnpj_cpf","parceiro_logradouro", "parceiro_logradouro_numero","parceiro_bairro","parceiro_cidade","parceiro_estado","parceiro_cep", "parceiro_regiao","parceiro_telefone","parceiro_cidades_atende","parceiro_email", "parceiro_tipo", "parceiro_senha")
                VALUES ('${razao_social}','${nome_fantasia}','${cnpj}','${logradouro}', '${logradouroNumero}','${bairro}','${cidade}','${estado}','${cep}','${regiao}','${telefone}','${cidadesAtende}','${email}','${tipo}','${hashSenha}')
            `
            const resultado = await connectionDB.query(SQL);
            console.log("Parceiro cadastrado com sucesso!");
            res.send({ msg: "Parceiro cadastrado com sucesso!" });
        } catch (error) {
            console.error("Erro ao cadastrar parceiro:", error);
            res.status(500).send({ msg: "Erro ao cadastrar parceiro." });
        }
    }
}

async function editarParceiro(req, res) {
    const idParceiro = req.params.idParceiro;
    const { usuarioDados } = req.body;

    const fieldsToUpdate = [
        `parceiro_email = '${usuarioDados.email}'`,
        `parceiro_logradouro = '${usuarioDados.logradouro}'`,
        `parceiro_logradouro_numero = '${usuarioDados.numero}'`,
        `parceiro_bairro = '${usuarioDados.bairro}'`,
        `parceiro_cidade = '${usuarioDados.cidade}'`,
        `parceiro_estado = '${usuarioDados.estado}'`,
        `parceiro_cep = '${usuarioDados.cep}'`,
        `parceiro_regiao = '${usuarioDados.regiao}'`,
        `parceiro_cidades_atende = '${usuarioDados.cidadesAtende}'`
    ];

    if (usuarioDados.senha !== undefined && usuarioDados.senha !== '') {
        const hashSenha = await bcrypt.hash(usuarioDados.senha, 10)
        fieldsToUpdate.push(`parceiro_senha = '${hashSenha}'`);
    }

    const updateFieldsStr = fieldsToUpdate.join(', ');

    const SQL = `
        UPDATE 
            Parceiros 
        SET
            ${updateFieldsStr}
        WHERE
            parceiro_id = '${idParceiro}'
    `;

    DB.query(SQL, (err, _) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Falha' });
        } else {
            console.log('Editado!');
            res.status(200).json({ message: 'Parceiro data updated successfully' });
        }
    });
}

async function getParceiroById(req, res) {
    const id = req.params.idParceiro;
    try {

        const SQL1 = `
            SELECT * FROM
                Parceiros
            WHERE
                parceiro_id = '${id}'
        `
        const resultado = await connectionDB.query(SQL1);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        res.status(500).send({ msg: "Erro ao buscar dados do parceiro." });
    }
}

async function editarAdmin(req, res) {
    const razaoSocial = req.params.razaoSocial
    const tipoUsuario = req.params.tipoUsuario
    const { usuarioDados } = req.body

    if (tipoUsuario === 'Parceiro') {

        const fieldsToUpdate = [
            `parceiro_email = '${usuarioDados.email}'`,
            `parceiro_logradouro = '${usuarioDados.logradouro}'`,
            `parceiro_logradouro_numero = '${usuarioDados.numero}'`,
            `parceiro_bairro = '${usuarioDados.bairro}'`,
            `parceiro_cidade = '${usuarioDados.cidade}'`,
            `parceiro_estado = '${usuarioDados.estado}'`,
            `parceiro_cep = '${usuarioDados.cep}'`,
            `parceiro_regiao = '${usuarioDados.regiao}'`,
            `parceiro_cidades_atende = '${usuarioDados.cidadesAtende}'`
        ];

        if (usuarioDados.senha !== undefined && usuarioDados.senha !== '') {
            const hashSenha = await bcrypt.hash(usuarioDados.senha, 10)
            fieldsToUpdate.push(`parceiro_senha = '${hashSenha}'`);
        }

        const updateFieldsStr = fieldsToUpdate.join(', ');

        const SQL = `
        UPDATE 
            Parceiros 
        SET
            ${updateFieldsStr}
        WHERE
            parceiro_razao_social = '${razaoSocial}'
    `;

        DB.query(SQL, (err, _) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: 'Falha' });
            } else {
                console.log('Editado!');
                res.status(200).json({ message: 'Parceiro data updated successfully' });
            }
        });

    } else if (tipoUsuario === 'Estabelecimento') {
        const fieldsToUpdate = [
            `estabelecimento_email = '${usuarioDados.email}'`,
            `estabelecimento_logradouro = '${usuarioDados.logradouro}'`,
            `estabelecimento_logradouro_numero = '${usuarioDados.numero}'`,
            `estabelecimento_bairro = '${usuarioDados.bairro}'`,
            `estabelecimento_cidade = '${usuarioDados.cidade}'`,
            `estabelecimento_estado = '${usuarioDados.estado}'`,
            `estabelecimento_cep = '${usuarioDados.cep}'`,
            `estabelecimento_regiao = '${usuarioDados.regiao}'`
        ];

        if (usuarioDados.senha !== undefined && usuarioDados.senha !== '') {
            const hashSenha = await bcrypt.hash(usuarioDados.senha, 10)
            fieldsToUpdate.push(`estabelecimento_senha = '${hashSenha}'`);
        }

        const updateFieldsStr = fieldsToUpdate.join(', ');

        const SQL = `
            UPDATE 
                Estabelecimentos 
            SET
                ${updateFieldsStr}
            WHERE
                estabelecimento_razao_social = '${razaoSocial}'
        `;

        DB.query(SQL, (err, _) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: 'Failed to update estabelecimento data' });
            } else {
                console.log('Editado!');
                res.status(200).json({ message: 'Estabelecimento data updated successfully' });
            }
        });
    } else if (tipoUsuario === 'Administrador') {

        const fieldToUpdate = [
            `administrador_email = '${usuarioDados.email}'`,
        ];

        if (usuarioDados.senha !== undefined && usuarioDados.senha !== '') {
            const hashSenha = await bcrypt.hash(usuarioDados.senha, 10)
            fieldToUpdate.push(`administrador_senha = '${hashSenha}'`);
        }

        const updateFieldsStr = fieldToUpdate.join(', ');

        const SQL = `
        UPDATE 
            Administradores 
        SET
            ${updateFieldsStr}
        WHERE
        administrador_nome = '${razaoSocial}'
    `

        DB.query(SQL, (err, _) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Editado!')
            }
        })
    }


}

async function editarSenhaRec(req, _) {
    const idUser = req.params.idUser
    const tipo = req.params.tipo
    const { usuarioDados } = req.body
    const hashSenha = await bcrypt.hash(usuarioDados.senha, 10)

    if (tipo === 'Parceiro') {
        const SQL = `
        UPDATE 
            Parceiros 
        SET
            parceiro_senha = '${hashSenha}'
        WHERE
            parceiro_id = '${idUser}'
    `
        DB.query(SQL, (err, _) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Editado!')
            }
        })
    } else if (tipo === 'Estabelecimento') {
        const SQL = `
        UPDATE 
            Estabelecimentos 
        SET
            estabelecimento_senha = '${hashSenha}'
        WHERE
        estabelecimento_id = '${idUser}'
    `

        DB.query(SQL, (err, _) => {
            if (err) {
                console.log(err)
            } else {
                console.log('Editado!')
            }
        })
    }


}

//CRUD PARCEIROS

//CRUD ADMINISTRADOR
//Função para verificar se já tem cadastrado o mesmo email
async function existeAdministrador(email) {
    const res = await connectionDB.query(`
        SELECT
            *
        FROM
            Administradores
        WHERE
        administrador_email  = '${email}'
    `);

    var response = false
    res.rows.forEach(administrador => {
        if (administrador.administrador_email === email) {
            console.log("Já existe um usuário cadastrado com esse e-mail!")
            response = true
        }
    });
    return response
}

async function addAdmin(req, res) {
    const { nome, email, senha } = req.body;
    const existeAdm = await existeAdministrador(email);
    if (existeAdm) {
        res.status(409).send({ msg: "Já existe um administrador com esse e-mail" });
    } else {
        try {
            const hashSenha = await bcrypt.hash(senha, 10);
            const SQL = `
                INSERT INTO
                    Administradores("administrador_nome","administrador_email","administrador_senha")
                VALUES ('${nome}','${email}','${hashSenha}')
            `
            const resultado = await connectionDB.query(SQL);
            res.send({ msg: "Administrador cadastrado com sucesso!" });
        } catch (error) {
            console.error("Erro ao cadastrar administrador:", error);
            res.status(500).send({ msg: "Erro ao cadastrar administrador." });
        }
    }
}

async function listAllAdministrador(req, res) {
    console.log("Requisição de listagem de administradores recebida.");
    try {

        const SQL = `
    SELECT 
        *
    FROM 
        Administradores
    ORDER BY
        administrador_id 
    `
        const resultado = await connectionDB.query(SQL);
        console.log("Administradores listados com sucesso!");
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao listar administradores:", error);
        res.status(500).send({ msg: "Erro ao listar administradores." });
    }
}
//CRUD ADMINISTRADORES

const tokensAtivos = new Map();

// ENVIAR TOKEN
async function enviarToken(req, res) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const { email } = req.body;

    if (tokensAtivos.has(email)) {
        const tokenAnterior = tokensAtivos.get(email);
        tokensRevogados.add(tokenAnterior);
    }

    const token = jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });
    console.log(token);

    tokensAtivos.set(email, token);

    const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        auth: {
            user: "token.quantumteam@outlook.com",
            pass: "quantumteam2023"
        }
    });

    transporter.sendMail({
        from: 'token.quantumteam@outlook.com',
        to: email,
        subject: 'Seu Token',
        html: `Seu token é: <b>${token}</b>`
    });

    res.send({ msg: "Sucesso" });
}

const tokensRevogados = new Set();

// VALIDAR TOKEN
async function verificarToken(req, res) {
    const { token } = req.body;

    try {
        if (tokensRevogados.has(token)) {
            return res.status(401).json({ message: 'Token já foi usado.' });
        }

        const decoded = jwt.verify(token, jwtSecret);
        const email = decoded.email;

        if (tokensAtivos.get(email) !== token) {
            return res.status(401).json({ message: 'Token inválido ou expirado.' });
        }

        tokensRevogados.add(token);

        res.status(200).json({ message: 'Token válido.' });
    } catch (error) {
        res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
}

async function SelectToEdit(req, res) {
    const id = req.params.id;
    const tipo = req.params.tipo

    if (tipo === 'ComumParceiro') {
        let SQL = "SELECT parceiro_email, parceiro_logradouro, parceiro_logradouro_numero, parceiro_bairro, parceiro_cidade, parceiro_estado, parceiro_cep, parceiro_regiao, parceiro_cidades_atende FROM parceiros WHERE parceiro_ID = '" + id + "'"

        DB.query(SQL, (err, result) => {
            if (err) {
                res.send(err)
            } else {
                res.send({
                    email: result.rows.values().next().value.parceiro_email,
                    logradouro: result.rows.values().next().value.parceiro_logradouro,
                    numero: result.rows.values().next().value.parceiro_logradouro_numero,
                    bairro: result.rows.values().next().value.parceiro_bairro,
                    cidade: result.rows.values().next().value.parceiro_cidade,
                    estado: result.rows.values().next().value.parceiro_estado,
                    cep: result.rows.values().next().value.parceiro_cep,
                    regiao: result.rows.values().next().value.parceiro_regiao,
                    cidadesAtende: result.rows.values().next().value.parceiro_cidades_atende
                })
            }
        })
    } else if (tipo === 'ComumEstabelecimento') {
        let SQL2 = "SELECT estabelecimento_email, estabelecimento_logradouro, estabelecimento_logradouro_numero, estabelecimento_bairro, estabelecimento_cidade, estabelecimento_estado, estabelecimento_cep, estabelecimento_regiao FROM estabelecimentos WHERE estabelecimento_ID = '" + id + "'"

        DB.query(SQL2, (err, result) => {
            if (err) {
                res.send(err)
            } else {
                res.send({
                    email: result.rows.values().next().value.estabelecimento_email,
                    logradouro: result.rows.values().next().value.estabelecimento_logradouro,
                    numero: result.rows.values().next().value.estabelecimento_logradouro_numero,
                    bairro: result.rows.values().next().value.estabelecimento_bairro,
                    cidade: result.rows.values().next().value.estabelecimento_cidade,
                    estado: result.rows.values().next().value.estabelecimento_estado,
                    cep: result.rows.values().next().value.estabelecimento_cep,
                    regiao: result.rows.values().next().value.estabelecimento_regiao,
                })
            }
        })
    }
}

async function SelectToEditAdmin(req, res) {
    const razaoSocial = req.params.razaoSocial;
    const tipo = req.params.tipo;

    if (tipo === 'Parceiro') {
        let SQL = "SELECT parceiro_email, parceiro_logradouro, parceiro_logradouro_numero, parceiro_bairro, parceiro_cidade, parceiro_estado, parceiro_cep, parceiro_regiao, parceiro_cidades_atende FROM parceiros WHERE parceiro_razao_social = '" + razaoSocial + "'"

        DB.query(SQL, (err, result) => {
            if (err) {
                res.send(err)
            } else {
                res.send({
                    email: result.rows.values().next().value.parceiro_email,
                    logradouro: result.rows.values().next().value.parceiro_logradouro,
                    numero: result.rows.values().next().value.parceiro_logradouro_numero,
                    bairro: result.rows.values().next().value.parceiro_bairro,
                    cidade: result.rows.values().next().value.parceiro_cidade,
                    estado: result.rows.values().next().value.parceiro_estado,
                    cep: result.rows.values().next().value.parceiro_cep,
                    regiao: result.rows.values().next().value.parceiro_regiao,
                    cidadesAtende: result.rows.values().next().value.parceiro_cidades_atende
                })
            }
        })
    } else if (tipo === 'Estabelecimento') {
        let SQL2 = "SELECT estabelecimento_email, estabelecimento_logradouro, estabelecimento_logradouro_numero, estabelecimento_bairro, estabelecimento_cidade, estabelecimento_estado, estabelecimento_cep, estabelecimento_regiao FROM estabelecimentos WHERE estabelecimento_razao_social = '" + razaoSocial + "'"

        DB.query(SQL2, (err, result) => {
            if (err) {
                res.send(err)
            } else {
                res.send({
                    email: result.rows.values().next().value.estabelecimento_email,
                    logradouro: result.rows.values().next().value.estabelecimento_logradouro,
                    numero: result.rows.values().next().value.estabelecimento_logradouro_numero,
                    bairro: result.rows.values().next().value.estabelecimento_bairro,
                    cidade: result.rows.values().next().value.estabelecimento_cidade,
                    estado: result.rows.values().next().value.estabelecimento_estado,
                    cep: result.rows.values().next().value.estabelecimento_cep,
                    regiao: result.rows.values().next().value.estabelecimento_regiao,
                })
            }
        })
    } else if (tipo === 'Administrador') {
        let SQL2 = "SELECT administrador_email FROM administradores WHERE administrador_nome = '" + razaoSocial + "'"

        DB.query(SQL2, (err, result) => {
            if (err) {
                res.send(err)
            } else {
                res.send({
                    email: result.rows.values().next().value.administrador_email,
                })
            }
        })
    }
}

//PROCURAR EMAIL
async function verificaEmail(req, res) {
    const emailEDIT = req.params.emailEDIT;

    let SQL = (`SELECT parceiro_id, estabelecimento_id
    FROM parceiros 
    FULL JOIN estabelecimentos ON parceiro_id = estabelecimento_id 
    WHERE parceiros.parceiro_email = '${emailEDIT}'
    OR estabelecimentos.estabelecimento_email = '${emailEDIT}'`)

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        }

        if (result.rows.length === 1) {
            res.send({
                idParceiro: result.rows.values().next().value.parceiro_id,
                idEstabelecimento: result.rows.values().next().value.estabelecimento_id,
            });

        }
    })
};
// PROCURAR EMAIL

//função para retornar nome e tipo de todos os usuarios
async function getUsers(req, res) {
    try {
        const SQL1 = `
    SELECT 
        administrador_nome, administrador_id
    FROM 
        Administradores
    `
        const SQL2 = `
    SELECT
        estabelecimento_razao_social, estabelecimento_id
    FROM 
        estabelecimentos
    `
        const SQL3 = `
    SELECT
        parceiro_razao_social, parceiro_id
    FROM
        parceiros
    `
        const adms = await connectionDB.query(SQL1);
        const estabelecimentos = await connectionDB.query(SQL2);
        const parceiros = await connectionDB.query(SQL3);

        const users = new Array;
        for (let i = 0; i <= adms.rowCount; i++) {
            if (typeof (adms.rows[i]) !== "undefined") {
                users.push({ nome: adms.rows[i].administrador_nome, tipo: "Administrador", id: adms.rows[i].administrador_id })
            }
        }
        for (let i = 0; i <= parceiros.rowCount; i++) {
            if (typeof (parceiros.rows[i]) !== "undefined") {
                users.push({ nome: parceiros.rows[i].parceiro_razao_social, tipo: "Parceiro", id: parceiros.rows[i].parceiro_id })
            }
        }
        for (let i = 0; i <= estabelecimentos.rowCount; i++) {
            if (typeof (estabelecimentos.rows[i]) !== "undefined") {
                users.push({ nome: estabelecimentos.rows[i].estabelecimento_razao_social, tipo: "Estabelecimento", id: estabelecimentos.rows[i].estabelecimento_id })
            }
        }

        const usersPorId = users.sort((a, b) => (a.id < b.id) ? 1 : -1)

        res.send(usersPorId);
    } catch (error) {
        console.error("Erro ao listar usuários", error);
        res.status(500).send({ msg: "Erro ao listar usuários" });
    }

}

async function transacaoParceiroEstab(req, res) {
    try {
        const { volumeOleo, estabelecimento } = req.body;
        const idParceiro = req.params.idParceiro;

        const quantidadeMoedas = parseFloat(volumeOleo) * 100;
        const oleoFinal = parseFloat(volumeOleo)

        const saldoParceiroQuery = `SELECT parceiro_saldo FROM Parceiros WHERE parceiro_id = '${idParceiro}'`;
        const resultado = await connectionDB.query(saldoParceiroQuery);
        const saldoParceiro = parseFloat(resultado.rows[0].parceiro_saldo);

        if (saldoParceiro < quantidadeMoedas) {
            return res.status(500).json({ success: false, error: "Saldo do parceiro é igual a 0." });
        } else {
            // Atualizar o saldo do parceiro
            const updateParceirosQuery = "UPDATE Parceiros SET parceiro_saldo = parceiro_saldo - " + quantidadeMoedas + ", parceiro_volume_coleta_mes = parceiro_volume_coleta_mes + " + oleoFinal + " WHERE parceiro_id = '" + idParceiro + "'";

            await DB.query(updateParceirosQuery, (err, _) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Editado Parceiro!');
                }
            });

            // Atualizar o saldo do estabelecimento
            const updateEstabelecimentosQuery = "UPDATE Estabelecimentos SET estabelecimento_saldo = estabelecimento_saldo + " + quantidadeMoedas + ", estabelecimento_volume_comercializado_mes = estabelecimento_volume_comercializado_mes + " + oleoFinal + " WHERE estabelecimento_razao_social = '" + estabelecimento + "'";

            await DB.query(updateEstabelecimentosQuery, (err, _) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Editado Estabelecimento!');
                }
            });

            return res.status(501).json({ success: true });
        }

    } catch (error) {
        console.error("Erro ao processar a transação:", error);
    }
};

async function transacaoGreenneatParc(req, res) {
    try {
        const { valorCreditos } = req.body;
        const idParceiro = req.params.idParceiro;

        const currentDate = new Date();
        const horaAtual = currentDate.getHours();
        const dateBR = currentDate.setHours(horaAtual - 3);
        const novaData = new Date(dateBR);
        const formattedDate = novaData.toISOString();


        const insertTransacoesQuery = `
        INSERT INTO AcaoTransacaoCompra ("valor_comprado", "acao_compra_data", "id_parceiro", "aprovado") 
        VALUES ('${valorCreditos}', '${formattedDate}','${idParceiro}', NULL)  
        `
        await DB.query(insertTransacoesQuery, (err, _) => {
            if (err) {
                console.log(err);
            } else {
                console.log('Dados da compra registrados!');
            }
        });
    } catch (error) {
        console.error("Erro ao processar a transação:", error);
    }
};


async function listCarteiraSemVinculo(req, res) {
    console.log("Requisição de listagem de estabelecimentos sem vínculo na carteira do parceiro.");
    const id = req.params.idParceiro;
    try {
        const SQL = `
    SELECT 
        * 
    FROM
        Estabelecimentos
    WHERE
        estabelecimento_id
    NOT IN
        (
            SELECT id_estabelecimento FROM ParceiroCarteira WHERE id_parceiro = '${id}'
        )
    `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao listar estabelecimentos:", error);
        res.status(500).send({ msg: "Erro ao listar estabelecimentos." });
    }
}


async function listCarteiraDoParceiroLogado(req, res) {
    console.log("Requisição de listagem de estabelecimentos vinculados à carteira do usuário.");
    const id = req.params.idParceiro;
    try {

        const SQL1 = `
            SELECT * FROM
                Estabelecimentos e
            JOIN
                ParceiroCarteira c
            ON
                e.estabelecimento_id = c.id_estabelecimento
            WHERE
                c.id_parceiro = '${id}'
        `
        const resultado = await connectionDB.query(SQL1);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar estabelecimento:", error);
        res.status(500).send({ msg: "Erro ao buscar estabelecimento." });
    }
}

async function vincularCarteira(req, res) {
    const { idParceiro, estabelecimentoId } = req.body;
    try {
        const SQL = `
            INSERT INTO
                ParceiroCarteira("id_parceiro","id_estabelecimento")
            VALUES ('${idParceiro}','${estabelecimentoId}')
        `
        await connectionDB.query(SQL);
        console.log("Estabelecimento vinculado à carteira!");
        res.send({ msg: "Estabelecimento vinculado à carteira!" });

    } catch (error) {
        console.error("Erro ao vincular estabelecimento à carteira", error);
        res.status(500).send({ msg: "Erro ao vincular estabelecimento à carteira." })
    }
}

async function insertAcaoTransacoes(req, res) {
    const { idEstabelecimento, quantidadeMoedasString, volumeOleo, idParceiro } = req.body;

    try {
        const currentDate = new Date();
        const horaAtual = currentDate.getHours();
        const dateBR = currentDate.setHours(horaAtual - 3);
        const novaData = new Date(dateBR);
        const formattedDate = novaData.toISOString();

        const SQL = `
            INSERT INTO AcaoTransacoes("quantidade_oleo_coletado", "quantidade_moedas", "acao_data", "id_parceiro", "id_estabelecimento") 
            VALUES ('${volumeOleo}', '${quantidadeMoedasString}', '${formattedDate}', '${idParceiro}', '${idEstabelecimento}')  
        `;
        await connectionDB.query(SQL);
        res.send({ msg: "Acao Registrada" });

    } catch (error) {
        console.error(error);
    }
}

async function getRequisicoes(req, res) {
    try {
        const SQL = `
        SELECT * FROM AcaoTransacaoCompra a
        JOIN Parceiros p
        ON a.id_parceiro = p.parceiro_id
        WHERE aprovado IS NULL ;
        `

        const result = await connectionDB.query(SQL);
        res.send(result.rows);
    } catch (error) {
        console.error("Erro ao listar requisições", error);
        res.status(500).send({ msg: "Erro ao listar requisições." });
    }
    
}

async function getRequisicoesRecusadas(req, res) {
    try {
        const SQL = `
        SELECT * FROM AcaoTransacaoCompra a
        JOIN Parceiros p
        ON a.id_parceiro = p.parceiro_id
        WHERE aprovado = FALSE ;
        `

        const result = await connectionDB.query(SQL);
        res.send(result.rows);
    } catch (error) {
        console.error("Erro ao listar requisições", error);
        res.status(500).send({ msg: "Erro ao listar requisições." });
    }
    
}

async function getAllTransAdm(req, res) {
    try {
        const SQL1 = `
    SELECT 
        *
    FROM 
        AcaoTransacoes t
    JOIN 
        Estabelecimentos e 
    ON 
        t.id_estabelecimento = e.estabelecimento_id
    JOIN 
        Parceiros p
    ON 
        t.id_parceiro = p.parceiro_id
    `
        const SQL2 = `
    SELECT
        *
    FROM 
        AcaoTransacaoCompra c
    JOIN 
        Parceiros p
    ON 
        c.id_parceiro = p.parceiro_id
    WHERE
        aprovado = TRUE
    `
        const coletas = await connectionDB.query(SQL1);
        const comprasCreditos = await connectionDB.query(SQL2);

        const transacoes = new Array;
        for (let i = 0; i <= coletas.rowCount; i++) {
            if (typeof (coletas.rows[i]) !== "undefined") {
                transacoes.push({ tipo: "Coleta de óleo", data: coletas.rows[i].acao_data, creditos: coletas.rows[i].quantidade_moedas, estabelecimento: coletas.rows[i].estabelecimento_razao_social, parceiro: coletas.rows[i].parceiro_razao_social })
            }
        }
        for (let i = 0; i <= comprasCreditos.rowCount; i++) {
            if (typeof (comprasCreditos.rows[i]) !== "undefined") {
                transacoes.push({ tipo: "Compra de créditos GreenNeat", data: comprasCreditos.rows[i].acao_compra_data, creditos: comprasCreditos.rows[i].valor_comprado, estabelecimento: "N/A", parceiro: comprasCreditos.rows[i].parceiro_razao_social })
            }
        }
        const transacoesPorData = transacoes.sort((a, b) => (a.data < b.data) ? 1 : -1)

        res.send(transacoesPorData);
    } catch (error) {
        console.error("Erro ao listar transações", error);
        res.status(500).send({ msg: "Erro ao listar transações." });
    }

}

async function getTransacoesEstab(req, res) {
    const id = req.params.idEstabelecimento;
    try {

        const SQL1 = `
            SELECT * FROM
                AcaoTransacoes
            WHERE
                id_estabelecimento = '${id}'
            ORDER BY
                acao_data
            DESC
        `
        const resultado = await connectionDB.query(SQL1);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar transações:", error);
        res.status(500).send({ msg: "Erro ao buscar transações." });
    }
}

async function getTransacoesParceiro(req, res) {
    const id = req.params.idParceiro;
    try {

        const SQL1 = `
            SELECT * FROM AcaoTransacoes t 
            JOIN Estabelecimentos e 
            ON t.id_estabelecimento = e.estabelecimento_id
            WHERE t.id_parceiro = '${id}'
            ORDER BY t.acao_data
            DESC
        `
        const resultado = await connectionDB.query(SQL1);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar transações:", error);
        res.status(500).send({ msg: "Erro ao buscar transações." });
    }
}

async function getCreditosContratadosParceiro(req, res) {
    const id = req.params.idParceiro;
    try {

        const SQL1 = `
            SELECT * FROM AcaoTransacaoCompra
            WHERE id_parceiro = '${id}'
            ORDER BY acao_compra_data
            DESC
        `
        const resultado = await connectionDB.query(SQL1);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        res.status(500).send({ msg: "Erro ao buscar histórico de crédito comprado." });
    }
}

async function listAllPreco(_, res) {
    console.log("Requisição de listagem de preco recebida.");
    try {

        const SQL = `
        SELECT 
            *
        FROM 
            Preco
        ORDER BY
            preco_regiao 
    `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro ao listar preco:", error);
        res.status(500).send({ msg: "Erro ao listar preco." });
    }
}

async function editarPreco(req, res) {
    console.log("Requisição de edição de preço recebida")
    const { preco_oleo_virgem, preco_oleo_usado } = req.body
    const idPreco = req.params.idPreco;
    try {
        const SQL = `
            UPDATE 
                Preco 
            SET
                preco_oleo_virgem = '${preco_oleo_virgem}',
                preco_oleo_usado = '${preco_oleo_usado}'
            WHERE
                preco_id = '${idPreco}'
`;
        const resultado = await connectionDB.query(SQL);
        console.log("Preços editados com sucesso!");
        res.status(200).send({ msg: "Preços editados com sucesso!" });
    } catch (error) {
        console.error("Erro ao editar preço:", error);
        res.status(500).send({ msg: "Erro ao editar preço." });
    }
}

async function listParceirosMaisGastaram(req, res) {
    try {
        const SQL = `
                SELECT
                p.parceiro_razao_social AS nome_parceiro,
                p.parceiro_regiao AS regiao,
                SUM(CAST(at.quantidade_moedas AS DECIMAL)) AS total_creditos_doados
            FROM Parceiros p
            LEFT JOIN AcaoTransacoes at ON p.parceiro_id = at.id_parceiro
            WHERE at.quantidade_moedas IS NOT NULL
            GROUP BY p.parceiro_razao_social, p.parceiro_regiao
            ORDER BY total_creditos_doados DESC;
        `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro", error);
        res.status(500).send({ msg: "Erro" });
    }
}

async function listEstabelecimentoMaisGastaram(req, res) {
    try {
        const SQL = `
            SELECT
                e.estabelecimento_razao_social AS nome_estabelecimento,
                e.estabelecimento_regiao AS regiao,
                SUM(CAST(at.quantidade_oleo_coletado AS DECIMAL)) AS total_oleo_coletado
            FROM Estabelecimentos e
            LEFT JOIN AcaoTransacoes at ON e.estabelecimento_id = at.id_estabelecimento
            WHERE at.quantidade_oleo_coletado IS NOT NULL
            GROUP BY e.estabelecimento_razao_social, e.estabelecimento_regiao
            ORDER BY total_oleo_coletado DESC;
    
        `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro", error);
        res.status(500).send({ msg: "Erro" });
    }
}

async function listRegioesParceirosMaisGastaram(req, res) {
    try {
        const SQL = `
            SELECT
                p.parceiro_regiao AS regiao,
                SUM(CAST(at.quantidade_moedas AS DECIMAL)) AS total_creditos_doados
            FROM Parceiros p
            LEFT JOIN AcaoTransacoes at ON p.parceiro_id = at.id_parceiro
            WHERE at.quantidade_moedas IS NOT NULL
            GROUP BY p.parceiro_regiao
            ORDER BY total_creditos_doados DESC;
        `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro", error);
        res.status(500).send({ msg: "Erro" });
    }
}

async function listRegioesEstabMaisReceberam(req, res) {
    try {
        const SQL = `
            SELECT
                e.estabelecimento_regiao AS regiao,
                SUM(CAST(at.quantidade_moedas AS DECIMAL)) AS total_moedas_recebidas
            FROM Estabelecimentos e
            LEFT JOIN AcaoTransacoes at ON e.estabelecimento_id = at.id_estabelecimento
            WHERE at.quantidade_moedas IS NOT NULL
            GROUP BY e.estabelecimento_regiao
            ORDER BY total_moedas_recebidas DESC;
    
        `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro", error);
        res.status(500).send({ msg: "Erro" });
    }
}

async function listRegioesEstabMaisOleoDescarte(req, res) {
    try {
        const SQL = `
                SELECT
                e.estabelecimento_regiao AS regiao,
                SUM(CAST(at.quantidade_oleo_coletado AS DECIMAL)) AS total_oleo_descartado
            FROM Estabelecimentos e
            LEFT JOIN AcaoTransacoes at ON e.estabelecimento_id = at.id_estabelecimento
            WHERE at.quantidade_oleo_coletado IS NOT NULL
            GROUP BY e.estabelecimento_regiao
            ORDER BY total_oleo_descartado DESC;
        `
        const resultado = await connectionDB.query(SQL);
        res.send(resultado.rows);
    } catch (error) {
        console.error("Erro", error);
        res.status(500).send({ msg: "Erro" });
    }
}

async function selectComparador(req, res) {
    console.log("Requisição comparador recebida");
    const { regiao } = req.params;
    try {
        const SQL = `
            SELECT
                preco_oleo_virgem,
                preco_oleo_usado
            FROM Preco 
            WHERE preco_regiao = '${regiao}'
        `;
        const resultado = await connectionDB.query(SQL);

        const precoOleoVirgem = parseFloat(resultado.rows[0].preco_oleo_virgem);
        const precoOleoUsado = parseFloat(resultado.rows[0].preco_oleo_usado);


        const valorMedio = (precoOleoVirgem + precoOleoUsado + 10) / 3;
        const valorMedioFormatado = valorMedio.toFixed(2); // Formata o valor para ter 3 casas decimais
        const response = {
            preco_oleo_virgem: precoOleoVirgem,
            preco_oleo_usado: precoOleoUsado,
            valor_medio: parseFloat(valorMedioFormatado) // Converte o valor formatado de volta para float
        };

        res.send(response);
    } catch (error) {
        console.error("Erro ao buscar valores:", error);
        res.status(500).send({ msg: "Erro ao buscar valores." });
    }
}

//app.put('/aprovado/:idAcao/:idParceiro/:valor', aprovarRequisicao);
async function aprovarRequisicao(req, res) {
    console.log("requisição de créditos")
    const idAcao = req.params.idAcao;
    const idParceiro = req.params.idParceiro;
    const valor = req.params.valor;
    try {
        const SQL1 = `
            UPDATE 
                AcaoTransacaoCompra 
            SET
                aprovado = TRUE 
            WHERE
                acao_transacao_compra_id = '${idAcao}'
            `;
        const SQL2 = `
            UPDATE
                Parceiros
            SET
                parceiro_saldo = parceiro_saldo + '${valor}' 
            WHERE
                parceiro_id = '${idParceiro}' 
        `;
        const aprovacao = await connectionDB.query(SQL1);
        const atualizaSaldo = await connectionDB.query(SQL2);
        console.log("Requisição de créditos aprovada");
        res.send({ msg: "sucesso!" });
    } catch (error) {
        console.error("Erro ao editar preço:", error);
        res.status(500).send({ msg: "Erro ao editar preço." });
    }
}

async function recusarRequisicao(req, res) {
    console.log("requisição de créditos")
    const idAcao = req.params.idAcao;
    try {
        const SQL = `
            UPDATE 
                AcaoTransacaoCompra 
            SET
                aprovado = FALSE 
            WHERE
                acao_transacao_compra_id = '${idAcao}'
            `;
        const reprovado = await connectionDB.query(SQL);
        console.log("Requisição de créditos recusada");
        res.status(200).send({ msg: "sucesso!" });
    } catch (error) {
        console.error("Erro ao editar preço:", error);
        res.status(500).send({ msg: "Erro ao editar preço." });
    }
}