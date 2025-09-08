import React, { createContext, useContext, useState } from 'react';

const SoundContext = createContext();

export function SoundProvider({ children }) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    return (
        <SoundContext.Provider value={{ soundEnabled, setSoundEnabled }}>
            {children}
        </SoundContext.Provider>
    );
}

export function useSound() {
    return useContext(SoundContext);
}