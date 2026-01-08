
import React, { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Engine, ISourceOptions } from "@tsparticles/engine";

const ParticleBackground: React.FC = () => {
    const [init, setInit] = useState(false);
    const [particleColor, setParticleColor] = useState("#10b981");

    useEffect(() => {
        initParticlesEngine(async (engine: Engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });

        const handleSync = (e: any) => {
            if (e.detail?.color) {
                setParticleColor(e.detail.color);
            }
        };

        window.addEventListener('mesh_sync', handleSync);
        return () => window.removeEventListener('mesh_sync', handleSync);
    }, []);

    const options: ISourceOptions = {
        fpsLimit: 120,
        interactivity: {
            events: {
                onClick: {
                    enable: true,
                    mode: "push",
                },
                onHover: {
                    enable: true,
                    mode: "grab",
                },
            },
            modes: {
                push: {
                    quantity: 4,
                },
                grab: {
                    distance: 200,
                    links: {
                        opacity: 0.5,
                    },
                },
            },
        },
        particles: {
            color: {
                value: particleColor,
            },
            links: {
                color: particleColor,
                distance: 150,
                enable: true,
                opacity: 0.15,
                width: 1,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: {
                    default: "bounce",
                },
                random: false,
                speed: 0.8,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                },
                value: 100,
            },
            opacity: {
                value: 0.2,
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 1, max: 3 },
            },
        },
        detectRetina: true,
        fullScreen: {
            enable: true,
            zIndex: -1,
        },
    };

    if (init) {
        return <Particles id="tsparticles" options={options} />;
    }

    return null;
};

export default ParticleBackground;
