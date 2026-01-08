
import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

export const useStreaming = (isBroadcaster: boolean, targetPeerId?: string) => {
    const [peerId, setPeerId] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const peerRef = useRef<Peer | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const initPeer = useCallback(async () => {
        const peer = new Peer(undefined, {
            host: '0.0.0.0', // Standard PeerJS server or peerjs-server
            port: 9000,
            path: '/myapp'
        });

        // Fallback to public PeerJS server if local one isn't setup
        const publicPeer = new Peer();

        publicPeer.on('open', (id) => {
            console.log(`[STREAM] Peer node opened: ${id}`);
            setPeerId(id);
        });

        publicPeer.on('error', (err) => {
            console.error('[STREAM] Peer link failure:', err);
            setError(err.type);
        });

        if (isBroadcaster) {
            publicPeer.on('call', (call) => {
                console.log('[STREAM] Incoming signal request, bridging...');
                if (localStreamRef.current) {
                    call.answer(localStreamRef.current);
                }
            });
        }

        peerRef.current = publicPeer;
    }, [isBroadcaster]);

    const startCapture = async (source: 'camera' | 'screen', options: MediaStreamConstraints) => {
        try {
            let captureStream: MediaStream;
            if (source === 'screen') {
                captureStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
            } else {
                captureStream = await navigator.mediaDevices.getUserMedia(options);
            }
            localStreamRef.current = captureStream;
            setStream(captureStream);
            return captureStream;
        } catch (err) {
            console.error('[STREAM] Capture failure:', err);
            setError('CAPTURE_FAILED');
            throw err;
        }
    };

    const callPeer = (targetId: string) => {
        if (!peerRef.current) return;
        console.log(`[STREAM] Calling peer signal: ${targetId}`);
        const call = peerRef.current.call(targetId, new MediaStream()); // Sending empty stream as viewer
        call.on('stream', (remote) => {
            console.log('[STREAM] Remote signal received.');
            setRemoteStream(remote);
        });
        call.on('close', () => {
            setRemoteStream(null);
        });
        call.on('error', (err) => {
            console.error('[STREAM] Call signal failure:', err);
        });
    };

    useEffect(() => {
        initPeer();
        return () => {
            peerRef.current?.destroy();
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [initPeer]);

    useEffect(() => {
        if (!isBroadcaster && targetPeerId && peerId) {
            callPeer(targetPeerId);
        }
    }, [isBroadcaster, targetPeerId, peerId]);

    return { peerId, stream, remoteStream, error, startCapture };
};
