import { useAuthStore } from '../stores/authStore';

class API {
  private getHeaders() {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  private async handleResponse(response: Response) {
    if (response.status === 403) {
      // Token invalide ou expiré
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Une erreur est survenue');
    }

    return response;
  }

  async getUsers() {
    const response = await fetch('/api/users', {
      headers: this.getHeaders(),
    });
    
    await this.handleResponse(response);
    return response.json();
  }

  async createUser(username: string, password: string, is_admin: boolean) {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password, is_admin }),
    });
    
    await this.handleResponse(response);
    return response.json();
  }

  async updateUser(userId: string, updates: any) {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    
    await this.handleResponse(response);
    return response.json();
  }

  async deleteUser(userId: string) {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    await this.handleResponse(response);
  }

  async getSettings() {
    const response = await fetch('/api/settings/global', {
      headers: this.getHeaders(),
    });
    
    await this.handleResponse(response);
    return response.json();
  }

  async getPublicSettings() {
    const response = await fetch('/api/settings/public', {
      headers: this.getHeaders(),
    });
    
    await this.handleResponse(response);
    return response.json();
  }

  async updateSettings(settings: any) {
    const response = await fetch('/api/settings/global', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    
    await this.handleResponse(response);
    return response.json();
  }
}

export const api = new API();