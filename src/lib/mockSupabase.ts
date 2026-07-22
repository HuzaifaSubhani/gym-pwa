// Offline Mock Supabase Client implementation using localStorage

const isServer = typeof window === 'undefined';

// Initial Mock Data
const defaultProfiles = [
  {
    id: "mock-user-uuid-123456",
    username: "Athlete",
    total_volume: 125000,
    workouts_completed: 45,
    is_admin: false,
    created_at: new Date().toISOString()
  },
  {
    id: "huzaifa-admin-id",
    username: "Huzaifa",
    total_volume: 250000,
    workouts_completed: 78,
    is_admin: true,
    created_at: new Date().toISOString()
  }
];

const defaultChallenges = [
  {
    id: "challenge-1",
    challenger_id: "huzaifa-admin-id",
    challenged_id: "mock-user-uuid-123456",
    status: "pending",
    created_at: new Date().toISOString()
  }
];

function getStorageItem(key: string, defaultValue: any) {
  if (isServer) return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultValue;
  }
}

function setStorageItem(key: string, value: any) {
  if (isServer) return;
  localStorage.setItem(key, JSON.stringify(value));
}

class MockQueryBuilder {
  tableName: string;
  filters: Array<{ col: string; val: any }> = [];
  orFilter: string | null = null;
  isSingle: boolean = false;
  queryType: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  payload: any = null;
  countOption: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    this.queryType = 'select';
    if (options?.count) {
      this.countOption = options.count;
    }
    return this;
  }

  insert(data: any) {
    this.queryType = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.queryType = 'update';
    this.payload = data;
    return this;
  }

  upsert(data: any) {
    this.queryType = 'upsert';
    this.payload = data;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ col: column, val: value });
    return this;
  }

  or(filterString: string) {
    this.orFilter = filterString;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const storageKey = `mock_db_${this.tableName}`;
      let defaultData: any[] = [];
      if (this.tableName === 'profiles') defaultData = defaultProfiles;
      if (this.tableName === 'challenges') defaultData = defaultChallenges;

      let list = getStorageItem(storageKey, defaultData);
      let data: any = null;
      let error: any = null;
      let count: number | undefined = undefined;

      // Apply standard filters
      let filtered = [...list];
      if (this.filters.length > 0) {
        filtered = filtered.filter(row => 
          this.filters.every(f => String(row[f.col]) === String(f.val))
        );
      }

      // Apply OR filters
      if (this.orFilter) {
        const conditions = this.orFilter.split(',');
        filtered = filtered.filter(row => {
          return conditions.some(cond => {
            const [col, op, val] = cond.split('.');
            if (op === 'eq') {
              return String(row[col]) === String(val);
            }
            return false;
          });
        });
      }

      if (this.queryType === 'select') {
        if (this.isSingle) {
          data = filtered[0] || null;
        } else {
          data = filtered;
        }
        if (this.countOption) {
          count = filtered.length;
        }
      } else if (this.queryType === 'insert') {
        const itemsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        const newItems = itemsToInsert.map(item => ({
          id: item.id || `id-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          ...item
        }));
        
        list.push(...newItems);
        setStorageItem(storageKey, list);
        data = Array.isArray(this.payload) ? newItems : newItems[0];
      } else if (this.queryType === 'update') {
        let updatedCount = 0;
        list = list.map(row => {
          // Check if this row matches our filters
          const matches = this.filters.every(f => String(row[f.col]) === String(f.val));
          if (matches) {
            updatedCount++;
            return { ...row, ...this.payload };
          }
          return row;
        });
        setStorageItem(storageKey, list);
        data = this.payload;
      } else if (this.queryType === 'upsert') {
        const itemsToUpsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        itemsToUpsert.forEach(item => {
          let matchIndex = -1;
          if (this.tableName === 'workout_logs') {
            matchIndex = list.findIndex(row => 
              row.user_id === item.user_id && 
              row.date_str === item.date_str && 
              row.exercise_id === item.exercise_id
            );
          } else {
            matchIndex = list.findIndex(row => row.id === item.id);
          }

          if (matchIndex > -1) {
            list[matchIndex] = { ...list[matchIndex], ...item };
          } else {
            list.push({
              id: item.id || `id-${Math.random().toString(36).substr(2, 9)}`,
              created_at: new Date().toISOString(),
              ...item
            });
          }
        });
        setStorageItem(storageKey, list);
        data = this.payload;
      }

      const response = { data, error, count };
      if (onfulfilled) {
        return onfulfilled(response);
      }
      return response;
    } catch (e: any) {
      if (onrejected) return onrejected(e);
      throw e;
    }
  }
}

export const mockSupabase = {
  auth: {
    async getSession() {
      if (isServer) return { data: { session: null }, error: null };
      const sessionStr = localStorage.getItem('mock_auth_session');
      if (!sessionStr) {
        return { data: { session: null }, error: null };
      }
      try {
        return { data: { session: JSON.parse(sessionStr) }, error: null };
      } catch (e) {
        return { data: { session: null }, error: null };
      }
    },

    async getUser() {
      const { data: { session } } = await this.getSession();
      return { data: { user: session?.user || null }, error: null };
    },

    async signUp({ email, password, options }: any) {
      if (isServer) return { data: { user: null, session: null }, error: null };
      const userId = `mock-user-${Math.random().toString(36).substr(2, 9)}`;
      const user = {
        id: userId,
        email,
        user_metadata: options?.data || {}
      };
      const session = {
        access_token: "mock-jwt-token",
        user
      };

      // Save session
      localStorage.setItem('mock_auth_session', JSON.stringify(session));

      // Create profile record
      const profiles = getStorageItem('mock_db_profiles', defaultProfiles);
      profiles.push({
        id: userId,
        username: options?.data?.username || email.split('@')[0],
        total_volume: 0,
        workouts_completed: 0,
        is_admin: email.includes('admin') || email === 'huzaifasubhani.hs@gmail.com',
        created_at: new Date().toISOString()
      });
      setStorageItem('mock_db_profiles', profiles);

      return { data: { user, session }, error: null };
    },

    async signInWithPassword({ email, password }: any) {
      if (isServer) return { data: { user: null, session: null }, error: null };
      
      // Let's resolve email from username if applicable
      let resolvedEmail = email;
      const profiles = getStorageItem('mock_db_profiles', defaultProfiles);
      
      let matchedProfile = profiles.find(p => p.username.toLowerCase() === email.toLowerCase());
      if (matchedProfile) {
        resolvedEmail = matchedProfile.email || `${matchedProfile.username}@example.com`;
      } else {
        matchedProfile = profiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
      }

      const userId = matchedProfile?.id || `mock-user-${Math.random().toString(36).substr(2, 9)}`;
      const username = matchedProfile?.username || email.split('@')[0];

      const user = {
        id: userId,
        email: resolvedEmail,
        user_metadata: { username }
      };

      const session = {
        access_token: "mock-jwt-token",
        user
      };

      // Create profile record if not exists
      if (!matchedProfile) {
        profiles.push({
          id: userId,
          username,
          total_volume: 0,
          workouts_completed: 0,
          is_admin: resolvedEmail.includes('admin') || resolvedEmail === 'huzaifasubhani.hs@gmail.com',
          created_at: new Date().toISOString()
        });
        setStorageItem('mock_db_profiles', profiles);
      }

      localStorage.setItem('mock_auth_session', JSON.stringify(session));
      return { data: { user, session }, error: null };
    },

    async signOut() {
      if (!isServer) {
        localStorage.removeItem('mock_auth_session');
      }
      return { error: null };
    },

    async resetPasswordForEmail(email: string, options: any) {
      return { error: null };
    },

    async updateUser(attributes: any) {
      const { data: { session } } = await this.getSession();
      if (!session) return { data: { user: null }, error: "No session active" };

      const updatedUser = {
        ...session.user,
        user_metadata: {
          ...session.user.user_metadata,
          ...attributes.data
        }
      };

      localStorage.setItem('mock_auth_session', JSON.stringify({
        ...session,
        user: updatedUser
      }));

      return { data: { user: updatedUser }, error: null };
    }
  },

  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },

  async rpc(functionName: string, args?: any) {
    if (functionName === 'get_email_from_username') {
      const profiles = getStorageItem('mock_db_profiles', defaultProfiles);
      const profile = profiles.find(p => p.username.toLowerCase() === args?.p_username?.toLowerCase());
      if (profile) {
        return { data: profile.email || `${profile.username}@example.com`, error: null };
      }
      return { data: null, error: "Username not found" };
    }

    if (functionName === 'delete_user') {
      if (!isServer) {
        const sessionStr = localStorage.getItem('mock_auth_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            const profiles = getStorageItem('mock_db_profiles', defaultProfiles);
            const updatedProfiles = profiles.filter(p => p.id !== session?.user?.id);
            setStorageItem('mock_db_profiles', updatedProfiles);
          } catch (e) {}
        }
        localStorage.removeItem('mock_auth_session');
      }
      return { error: null };
    }

    return { data: null, error: "Function not mocked" };
  },

  storage: {
    from(bucketName: string) {
      return {
        async upload(filePath: string, file: any) {
          return { data: { path: filePath }, error: null };
        },
        getPublicUrl(filePath: string) {
          // Return default/mock URLs
          return { data: { publicUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop" } };
        }
      };
    }
  }
};
