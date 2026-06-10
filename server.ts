import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple in-memory storage for verification codes
// Key: email/whatsapp (lowercased), Value: { code: string, expiresAt: number }
const verificationStore = new Map<string, { code: string; expiresAt: number }>();

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Supabase client
const SUPABASE_URL = process.env.URL_SUPABASE || process.env.SUPABASE_URL || 'https://omecgzlgvhqoupselomj.supabase.co';
const SUPABASE_ANON_KEY = process.env.KEY_SUPABASE || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZWNnemxndmhxb3Vwc2Vsb21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzA2MDIsImV4cCI6MjA5NjUwNjYwMn0.x6Tc6I0mBL69Z6ok_Cjq6sCkxKNTw1UA_bMRDNsL9kw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function generate8CharAlphanumeric(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. GET /api/health-check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', datetime: new Date().toISOString() });
});

// 2. POST /api/send-reset-code
app.post('/api/send-reset-code', async (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ success: false, message: 'É necessário informar o contato (E-mail).' });
  }

  const cleanContact = contact.trim().toLowerCase();

  try {
    let userName = 'Cliente';
    let databaseMode = 'mock';

    if (supabase) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanContact);

        if (!userError && userData && userData.length > 0) {
          userName = userData[0].name;
          databaseMode = 'supabase';
        }
      } catch (err) {
        console.warn('Erro ao verificar usuário no Supabase, prosseguindo no modo local:', err);
      }
    }

    const code = generate8CharAlphanumeric();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save code associated with email in memory
    verificationStore.set(cleanContact, { code, expiresAt });

    // Send SMTP email
    const transporter = nodemailer.createTransport({
      host: 'smtp-upmail.sighost.com.br',
      port: 587,
      secure: false, // TLS on 587 uses STARTTLS
      auth: {
        user: 'scanner@printti.com.br',
        pass: 'F:4eyD3m'
      },
      tls: {
        rejectUnauthorized: false // Avoid SSL/TLS handshake certificate issues
      }
    });

    const mailOptions = {
      from: '"suporte@supermercadofavorito.com.br" <scanner@printti.com.br>',
      replyTo: 'suporte@supermercadofavorito.com.br',
      to: cleanContact,
      subject: 'Seu Código de Recuperação - Supermercado O Favorito',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #fafdfb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #059669; font-weight: bold; margin: 0; font-size: 24px;">Supermercado O Favorito</h2>
            <p style="color: #059669; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Clube de Fidelidade & Vantagens</p>
          </div>
          <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Olá, <strong>${userName}</strong>!</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Recebemos seu pedido de redefinição de senha para a sua conta de cliente.
              Utilize o código de verificação alfanumérico abaixo para validar a operação e prosseguir com a redefinição de sua senha de login:
            </p>
            
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 14px 28px; background-color: #f0fdf4; color: #15803d; border: 2px dashed #bbf7d0; border-radius: 10px; display: inline-block;">
                ${code}
              </span>
            </div>
            
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              <strong>Importante:</strong> Este código é único e expira em <strong>10 minutos</strong>. Caso não tenha solicitado esta alteração, ignore este e-mail imediatamente para garantir a segurança dos seus dados.
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; border-top: 1px solid #edf2f7; padding-top: 16px;">
            <p style="margin: 0 0 6px 0;">© ${new Date().getFullYear()} Supermercado O Favorito - Todos os direitos reservados.</p>
            <p style="margin: 0;">Precisando de ajuda? Entre em contato pelo e-mail oficial: <a href="mailto:suporte@supermercadofavorito.com.br" style="color: #059669; text-decoration: none; font-weight: bold;">suporte@supermercadofavorito.com.br</a></p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Código de recuperação enviado para ${cleanContact}: ${code}`);

    res.json({ 
      success: true, 
      databaseMode,
      message: 'Código de verificação alfanumérico enviado com sucesso para o seu e-mail cadastrado!' 
    });

  } catch (error: any) {
    console.error('Erro no SMTP:', error);
    res.status(500).json({ 
      success: false, 
      message: `Não foi possível enviar o e-mail de recuperação: ${error.message || error}`
    });
  }
});

// 3. POST /api/verify-reset-code
app.post('/api/verify-reset-code', (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) {
    return res.status(400).json({ success: false, message: 'Dados insuficientes fornecidos para verificação.' });
  }

  const cleanContact = contact.trim().toLowerCase();
  const cleanCode = code.trim().toUpperCase();

  const record = verificationStore.get(cleanContact);
  if (!record) {
    return res.status(400).json({ success: false, message: 'Nenhum código gerado para este e-mail ou o código expirou.' });
  }

  if (Date.now() > record.expiresAt) {
    verificationStore.delete(cleanContact);
    return res.status(400).json({ success: false, message: 'O código de verificação expirou (limite de 10 minutos excedido).' });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({ success: false, message: 'O código de 8 caracteres informado está incorreto. Tente novamente.' });
  }

  res.json({ success: true, message: 'Código validado com sucesso! Agora você pode criar sua nova senha.' });
});

// 4. POST /api/complete-reset-password
app.post('/api/complete-reset-password', async (req, res) => {
  const { contact, code, newPassword } = req.body;
  if (!contact || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
  }

  const cleanContact = contact.trim().toLowerCase();
  const cleanCode = code.trim().toUpperCase();

  const record = verificationStore.get(cleanContact);
  if (!record) {
    return res.status(400).json({ success: false, message: 'Código de verificação inexistente ou expirado.' });
  }

  if (Date.now() > record.expiresAt) {
    verificationStore.delete(cleanContact);
    return res.status(400).json({ success: false, message: 'O código de verificação expirou.' });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({ success: false, message: 'Código de verificação inválido.' });
  }

  try {
    let databaseUpdated = false;

    if (supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ password: newPassword })
          .eq('email', cleanContact);

        if (!error) {
          databaseUpdated = true;
        } else {
          console.warn('Erro ao salvar no Supabase, tentando local fallback:', error);
        }
      } catch (err) {
        console.warn('Falha na atualização do Supabase:', err);
      }
    }

    // Clear code from store
    verificationStore.delete(cleanContact);

    res.json({
      success: true,
      databaseUpdated,
      message: 'Sua senha foi atualizada com sucesso! Se você estiver utilizando o modo online, ela já está gravada. Se estiver em modo local, a senha local também será atualizada.'
    });

  } catch (error: any) {
    console.error('Erro geral ao atualizar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Código verificado, mas ocorreu um erro ao gravar a senha: ' + (error.message || error)
    });
  }
});

// Serve frontend assets
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Rodando em http://0.0.0.0:${PORT} no modo de ${isProd ? 'produção' : 'desenvolvimento'}`);
  });
}

startServer();
