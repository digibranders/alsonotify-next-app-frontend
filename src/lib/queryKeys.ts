export const queryKeys = {
  auth: {
    user: () => ['auth', 'user'] as const,
    verifyToken: (token: string | null) => ['auth', 'verifyToken', token] as const,
  },
  users: {
    all: () => ['users'] as const,
    employees: (options: string = "", search?: string) => ['users', 'employees', options, { search }] as const,
    employeesRoot: () => ['users', 'employees'] as const,
    partners: (options: string = "", search?: string) => ['users', 'partners', options, { search }] as const,
    partnersRoot: () => ['users', 'partners'] as const,
    clients: () => ['users', 'clients'] as const,
    detail: (id: number | string) => ['users', 'detail', id] as const,
    me: () => ['users', 'me'] as const,
    company: () => ['users', 'company'] as const,
  },
  roles: {
    all: () => ['roles'] as const,
    permissions: (roleId: number | null) => ['roles', 'permissions', roleId] as const,
  },
  company: {
    departments: () => ['company', 'departments'] as const,
  },
  workspaces: {
    all: () => ['workspaces'] as const,
    list: (options: string = "") => ['workspaces', 'list', options] as const,
    listRoot: () => ['workspaces', 'list'] as const,
    detail: (id: number) => ['workspaces', 'detail', id] as const,
  },
  requirements: {
    all: () => ['requirements'] as const,
    byWorkspace: (workspaceId: number) => ['requirements', 'workspace', workspaceId] as const,
    collaborative: () => ['requirements', 'collaborative'] as const,
    activities: (requirementId: number) => ['requirements', 'activities', requirementId] as const,
  },
  tasks: {
    all: () => ['tasks'] as const,
    list: (filters?: Record<string, unknown>) => ['tasks', 'list', filters] as const,
    listRoot: () => ['tasks', 'list'] as const,
    byWorkspace: (workspaceId: number) => ['tasks', 'byWorkspace', workspaceId] as const,
    detail: (id: number | string) => ['tasks', 'detail', id] as const,
    assigned: () => ['tasks', 'assigned'] as const,
    worklogs: (taskId: number, limit: number = 50, skip: number = 0) => ['tasks', 'worklogs', taskId, { limit, skip }] as const,
    worklogsRoot: (taskId: number) => ['tasks', 'worklogs', taskId] as const,
    timer: (taskId: number) => ['tasks', 'timer', taskId] as const,
    activities: (taskId: number) => ['tasks', 'activities', taskId] as const,
  },
  notes: {
    all: () => ['notes'] as const,
    list: (filters: Record<string, unknown>) => ['notes', 'list', filters] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
  },
  meetings: {
    list: (options: string = "") => ['meetings', 'list', options] as const,
    detail: (id: number) => ['meetings', 'detail', id] as const,
    listRoot: () => ['meetings', 'list'] as const,
  },
  holidays: {
    all: () => ['holidays'] as const,
  },
  calendar: {
    events: (start?: string, end?: string) => ['calendar', 'events', { start, end }] as const,
    eventsRoot: () => ['calendar', 'events'] as const,
    teamsConnection: () => ['calendar', 'teamsConnection'] as const,
  },
  feedback: {
    all: () => ['feedback'] as const,
    list: (filters?: Record<string, unknown>) => ['feedback', 'list', filters] as const,
    admin: () => ['feedback', 'admin'] as const,
    adminList: (filters?: Record<string, unknown>) => ['feedback', 'admin', 'list', filters] as const,
  },
  leaves: {
    all: () => ['leaves'] as const,
    list: (options: string = "") => ['leaves', 'list', options] as const,
    company: () => ['leaves', 'company'] as const,
    detail: (id: number) => ['leaves', 'detail', id] as const,
    balance: () => ['leaves', 'balance'] as const,
  },
  mail: {
    folders: () => ["mail", "folders"] as const,
    messages: (params: any) => ["mail", "messages", params] as const,
    message: (id: string) => ["mail", "message", id] as const,
    attachments: (messageId: string) => ["mail", "attachments", messageId] as const,
  },
} as const;
