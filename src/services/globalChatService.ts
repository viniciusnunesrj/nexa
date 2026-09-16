import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GlobalChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  createdAt: string;
}

function mapMessage(row: any): GlobalChatMessage {
  if (
    !row ||
    typeof row.id !== 'string' ||
    typeof row.user_id !== 'string' ||
    typeof row.username !== 'string' ||
    typeof row.message !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    throw new Error('Mensagem de chat inválida.');
  }

  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    avatar: typeof row.avatar === 'string' ? row.avatar : undefined,
    message: row.message,
    createdAt: row.created_at,
  };
}

export class GlobalChatService {
  private static async assertSession(): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Chat Global online indisponível.');
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.id) {
      throw new Error('Sessão inválida. Entre novamente na sua conta.');
    }

    return data.user.id;
  }

  public static async fetchMessages(
    limit = 100
  ): Promise<GlobalChatMessage[]> {
    await this.assertSession();

    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

    const { data, error } = await supabase.rpc(
      'fetch_global_chat_messages_v1',
      {
        p_limit: safeLimit,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!Array.isArray(data)) {
      throw new Error('Resposta inválida do Chat Global.');
    }

    await this.assertSession();

    // O servidor retorna mais recentes primeiro.
    // A interface mostra o chat em ordem cronológica.
    return data.map(mapMessage).reverse();
  }

  public static async sendMessage(
    message: string
  ): Promise<GlobalChatMessage> {
    const userId = await this.assertSession();

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      throw new Error('Digite uma mensagem.');
    }

    if (cleanMessage.length > 300) {
      throw new Error('A mensagem deve ter no máximo 300 caracteres.');
    }

    const { data, error } = await supabase.rpc(
      'send_global_chat_message_v1',
      {
        p_message: cleanMessage,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    const confirmed = mapMessage(data);

    if (confirmed.userId !== userId) {
      throw new Error('Autor da mensagem não confirmado pelo servidor.');
    }

    await this.assertSession();

    return confirmed;
  }
}