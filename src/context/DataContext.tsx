'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Workspace, Requirement, Employee, Client, Task } from '../types/domain';
import { initialWorkspaces, initialRequirements, initialEmployees, initialClients, initialTasks } from '../data/defaultData';

interface DataContextType {
  workspaces: Workspace[];
  requirements: Requirement[];
  employees: Employee[];
  clients: Client[];
  tasks: Task[];

  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: number, updates: Partial<Workspace>) => void;
  getWorkspace: (id: number) => Workspace | undefined;

  addRequirement: (requirement: Requirement) => void;
  updateRequirement: (id: number, updates: Partial<Requirement>) => void;
  getRequirementsByWorkspace: (workspaceId: number) => Requirement[];

  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: number, updates: Partial<Employee>) => void;
  getEmployee: (id: number) => Employee | undefined;

  addClient: (client: Client) => void;
  updateClient: (id: number, updates: Partial<Client>) => void;
  getClient: (id: number) => Client | undefined;

  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  getTask: (id: string) => Task | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Workspace
  const addWorkspace = (workspace: Workspace) => {
    setWorkspaces(prev => [workspace, ...prev]);
  };

  const updateWorkspace = (id: number, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const getWorkspace = (id: number) => {
    return workspaces.find(w => w.id === id);
  };

  // Requirements
  const addRequirement = (requirement: Requirement) => {
    setRequirements(prev => [requirement, ...prev]);
  };

  const updateRequirement = (id: number, updates: Partial<Requirement>) => {
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const getRequirementsByWorkspace = (workspaceId: number) => {
    return requirements.filter(r => r.workspace_id === workspaceId);
  };

  // Employees
  const addEmployee = (employee: Employee) => {
    setEmployees(prev => [employee, ...prev]);
  };

  const updateEmployee = (id: number, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const getEmployee = (id: number) => {
    return employees.find(e => e.id === id);
  };

  // Clients
  const addClient = (client: Client) => {
    setClients(prev => [client, ...prev]);
  };

  const updateClient = (id: number, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getClient = (id: number) => {
    return clients.find(c => c.id === id);
  };

  // Tasks
  const addTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  const getTask = (id: string) => {
    return tasks.find(t => t.id === id);
  }

  return (
    <DataContext.Provider value={{
      workspaces,
      requirements,
      employees,
      clients,
      tasks,
      addWorkspace,
      updateWorkspace,
      getWorkspace,
      addRequirement,
      updateRequirement,
      getRequirementsByWorkspace,
      addEmployee,
      updateEmployee,
      getEmployee,
      addClient,
      updateClient,
      getClient,
      addTask,
      updateTask,
      getTask
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
