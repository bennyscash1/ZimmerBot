const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const TOKEN_STORAGE_KEY = 'zimmerpro_auth_token';

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const publicEndpoints = ['/auth/login', '/auth/register', '/auth/google', '/auth/phone/send-otp', '/auth/phone/verify-otp'];
  const isPublicEndpoint = publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint));

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (fetchError: any) {
    console.error(`❌ [API] Fetch failed for ${API_BASE_URL}${endpoint}:`, fetchError);
    const errorMessage = fetchError.message?.includes('fetch failed') || fetchError.message?.includes('Failed to fetch')
      ? `השרת לא זמין או לא ניתן להתחבר. בדוק שהשרת רץ על ${API_BASE_URL}`
      : fetchError.message || 'שגיאת רשת - לא ניתן להתחבר לשרת';
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const result = data.data || data;
  
  if (Array.isArray(result)) {
    return result.map(item => ({
      ...item,
      id: item.id || item._id?.toString() || item._id
    }));
  }
  
  if (result && typeof result === 'object') {
    return {
      ...result,
      id: result.id || result._id?.toString() || result._id
    };
  }
  
  return result;
};

export const unitsAPI = {
  getAll: () => apiRequest('/units'),
  getById: (id: string) => apiRequest(`/units/${id}`),
  create: (unitData: any) => apiRequest('/units', {
    method: 'POST',
    body: JSON.stringify(unitData),
  }),
  update: (id: string, unitData: any) => apiRequest(`/units/${id}`, {
    method: 'PUT',
    body: JSON.stringify(unitData),
  }),
  delete: (id: string) => apiRequest(`/units/${id}`, {
    method: 'DELETE',
  }),
};

export const uploadAPI = {
  uploadFile: async (fileData: string, fileName?: string, fileType?: string) => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileData, fileName, fileType }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`❌ [API] Upload failed:`, error);
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ [API] Upload response:`, data);
    if (!data.url) {
      console.error(`❌ [API] No URL in upload response:`, data);
      throw new Error('No URL returned from upload endpoint');
    }
    return data.url;
  },
};

export const roomsAPI = {
  getAll: () => apiRequest('/rooms'),
  getById: (id: string) => apiRequest(`/rooms/${id}`),
  create: (roomData: any) => apiRequest('/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  }),
  update: (id: string, roomData: any) => apiRequest(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roomData),
  }),
  delete: (id: string) => apiRequest(`/rooms/${id}`, {
    method: 'DELETE',
  }),
  getByUnitId: async (unitId: string) => {
    const rooms = await roomsAPI.getAll();
    return rooms.filter((r: any) => r.unitId === unitId || r.lodging_id === unitId);
  },
};

export const facilitiesAPI = {
  getAll: () => apiRequest('/facilities'),
  getById: (id: string) => apiRequest(`/facilities/${id}`),
  create: (facilityData: any) => apiRequest('/facilities', {
    method: 'POST',
    body: JSON.stringify(facilityData),
  }),
  update: (id: string, facilityData: any) => apiRequest(`/facilities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(facilityData),
  }),
  delete: (id: string) => apiRequest(`/facilities/${id}`, {
    method: 'DELETE',
  }),
};

export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const url = `${API_BASE_URL}/auth/login`;
      console.log('🌐 Login API call:', url, 'Method: POST');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({ error: 'Failed to parse response' }));
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return data.data || data;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Unknown error occurred during login');
    }
  },
  googleLogin: async (googleToken: string, mode: 'login' | 'register' = 'login', role?: string) => {
    try {
      const url = `${API_BASE_URL}/auth/google`;
      console.log('🔵 Google login API call:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken, mode, role }),
      });

      const data = await response.json().catch(() => ({ error: 'Failed to parse response' }));
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return data.data || data;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Google login failed');
    }
  },
  register: async (userData: any) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },
  getMe: () => apiRequest('/auth/me'),
  sendPhoneOTP: async (phoneNumber: string, mode: 'login' | 'register' = 'login', method: 'sms' | 'voice' = 'sms') => {
    const url = `${API_BASE_URL}/auth/phone/send-otp`;
    const payload = { phoneNumber, mode, method };
    
    console.log('📱 [API] Calling sendPhoneOTP');
    console.log('📱 [API] URL:', url);
    console.log('📱 [API] Payload:', payload);
    
    try {
      const response = await apiRequest('/auth/phone/send-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('✅ [API] sendPhoneOTP success:', response);
      return response;
    } catch (error: any) {
      console.error('❌ [API] sendPhoneOTP error:', error);
      console.error('❌ [API] Error message:', error?.message);
      throw error;
    }
  },
  verifyPhoneOTP: (phoneNumber: string, otp: string, userData?: any) => apiRequest('/auth/phone/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp, ...userData }),
  }),
  sendEmailOTP: async (idNumberOrEmail: string, mode: 'login' | 'register' = 'login') => {
    const url = `${API_BASE_URL}/auth/email/send-otp`;
    const payload = { idNumberOrEmail, mode };
    
    console.log('📧 [API] Calling sendEmailOTP');
    console.log('📧 [API] URL:', url);
    console.log('📧 [API] Payload:', payload);
    
    try {
      const response = await apiRequest('/auth/email/send-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('✅ [API] sendEmailOTP success:', response);
      return response;
    } catch (error: any) {
      console.error('❌ [API] sendEmailOTP error:', error);
      console.error('❌ [API] Error message:', error?.message);
      throw error;
    }
  },
  verifyEmailOTP: (idNumberOrEmail: string, otp: string, userData?: any) => apiRequest('/auth/email/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ idNumberOrEmail, otp, ...userData }),
  }),
};

export const bookingsAPI = {
  getAll: () => apiRequest('/bookings'),
  getById: (id: string) => apiRequest(`/bookings/${id}`),
  create: (bookingData: any) => apiRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),
  update: (id: string, bookingData: any) => apiRequest(`/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bookingData),
  }),
  delete: (id: string) => apiRequest(`/bookings/${id}`, {
    method: 'DELETE',
  }),
};

export const contactsAPI = {
  getAll: () => apiRequest('/contacts'),
  getById: (id: string) => apiRequest(`/contacts/${id}`),
  create: (contactData: any) => apiRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData),
  }),
  update: (id: string, contactData: any) => apiRequest(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contactData),
  }),
  delete: (id: string) => apiRequest(`/contacts/${id}`, {
    method: 'DELETE',
  }),
};

export const accountsAPI = {
  getAll: () => apiRequest('/accounts'),
  getById: (id: string) => apiRequest(`/accounts/${id}`),
  create: (accountData: any) => apiRequest('/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  }),
  update: (id: string, accountData: any) => apiRequest(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(accountData),
  }),
  delete: (id: string) => apiRequest(`/accounts/${id}`, {
    method: 'DELETE',
  }),
};

export const usersAPI = {
  getAll: () => apiRequest('/users'),
  getById: (id: string) => apiRequest(`/users/${id}`),
  create: (userData: any) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  update: (id: string, userData: any) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  delete: (id: string) => apiRequest(`/users/${id}`, {
    method: 'DELETE',
  }),
};

export const settingsAPI = {
  getStatistics: () => apiRequest('/settings/statistics'),
  getGoogleCalendarAuthUrl: () => apiRequest('/settings/google-calendar/auth-url'),
  connectGoogleCalendar: (code?: string) => apiRequest('/settings/google-calendar/connect', {
    method: 'POST',
    body: code ? JSON.stringify({ code }) : undefined,
  }),
  getWhatsAppConfig: () => apiRequest('/settings/whatsapp-config'),
  updateWhatsAppConfig: (config: any) => apiRequest('/settings/whatsapp-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  }),
  resetData: () => apiRequest('/settings/reset-data', {
    method: 'DELETE',
  }),
};
