import { useReducer, useCallback } from 'react'
import * as fsm from '../services/fsm.js'
import { generatePID } from '../services/pidGenerator.js'


const initialState = {
    processes: [], // array of process objects
    selectedPid: null,
}

function reducer(state, action) {
    switch (action.type) {
        case 'CREATE': {
            const pid = generatePID()
            const p = fsm.createProcess(pid, action.priority || 0)
            return { ...state, processes: [...state.processes, p], selectedPid: pid }
        }
        case 'UPDATE_PROCESS': {
            const updated = state.processes.map(pr => pr.pid === action.pid ? { ...action.process } : pr)
            return { ...state, processes: updated }
        }
        case 'SELECT':
            return { ...state, selectedPid: action.pid }
        case 'SET':
            return { ...state, ...action.payload }
        default:
            return state
    }
}

export default function useSimulation() {
    const [state, dispatch] = useReducer(reducer, initialState)


    const create = useCallback((priority = 0) => {
        dispatch({ type: 'CREATE', priority })
    }, [])


    const admit = useCallback((pid, cause = 'manual') => {
        const proc = state.processes.find(p => p.pid === pid)
        if (!proc) throw new Error('PID no encontrado')
        try {
            const newProc = fsm.admit({ ...proc }, cause)
            dispatch({ type: 'UPDATE_PROCESS', pid, process: newProc })
        } catch (e) {
            throw e
        }
    }, [state.processes])


    const assignCPU = useCallback((pid, cause = 'manual') => {
        const proc = state.processes.find(p => p.pid === pid)
        if (!proc) throw new Error('PID no encontrado')
        const newProc = fsm.assignCPU({ ...proc }, cause)
        dispatch({ type: 'UPDATE_PROCESS', pid, process: newProc })
    }, [state.processes])


    const preempt = useCallback((pid, cause = 'manual') => {
        const proc = state.processes.find(p => p.pid === pid)
        if (!proc) throw new Error('PID no encontrado')
        const newProc = fsm.preempt({ ...proc }, cause)
        dispatch({ type: 'UPDATE_PROCESS', pid, process: newProc })
    }, [state.processes])


    const requestIO = useCallback((pid, cause = 'manual') => {
        const proc = state.processes.find(p => p.pid === pid)
        if (!proc) throw new Error('PID no encontrado')
        const newProc = fsm.requestIO({ ...proc }, cause)
        dispatch({ type: 'UPDATE_PROCESS', pid, process: newProc })
    }, [state.processes])


    const ioComplete = useCallback((pid, cause = 'manual') => {
        const proc = state.processes.find(p => p.pid === pid)
        if (!proc) throw new Error('PID no encontrado')
        const newProc = fsm.ioComplete({ ...proc }, cause)
        dispatch({ type: 'UPDATE_PROCESS', pid, process: newProc })
    }, [state.processes])


    const terminate = useCallback((pid, cause = 'manual') => {
        const proc = state.processes.find(p => p.pid === pid)
        if (!proc) throw new Error('PID no encontrado')
        const newProc = fsm.terminate({ ...proc }, cause)
        dispatch({ type: 'UPDATE_PROCESS', pid, process: newProc })
    }, [state.processes])


    return {
        state,
        create, admit, assignCPU, preempt, requestIO, ioComplete, terminate,
        dispatch
    }
}