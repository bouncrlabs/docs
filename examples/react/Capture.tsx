import { useEffect, useRef, useState } from 'react';
import type { CaptureOptions, CaptureState } from '@bouncrlabs/idv';

type SDK = typeof import('@bouncrlabs/idv');
type CaptureInstance = Awaited<ReturnType<SDK['createCapture']>>;
type Props = Pick<CaptureOptions, 'token' | 'configuration'>;

export function Capture({ token, configuration }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const capture = useRef<CaptureInstance | undefined>(undefined);
  const [sdk, setSdk] = useState<SDK>();
  const [state, setState] = useState<CaptureState>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setState(undefined);
    setLoadError(false);
    let disposed = false;
    let instance: CaptureInstance | undefined;
    const url = '/bouncr/index.js';

    async function initialize() {
      const module: SDK = await import(/* @vite-ignore */ url);
      if (disposed || !video.current) return;
      instance = await module.createCapture({
        video: video.current,
        token,
        configuration,
        onState: next => { if (!disposed) setState(next); },
      });
      if (disposed) return instance.destroy();
      capture.current = instance;
      setSdk(module);
    }

    initialize().catch(() => { if (!disposed) setLoadError(true); });
    return () => {
      disposed = true;
      instance?.destroy();
      capture.current = undefined;
    };
  }, [token, configuration]);

  const ready = sdk && (state?.phase === sdk.Phase.READY || state?.phase === sdk.Phase.STOPPED);
  const active = sdk && state?.phase === sdk.Phase.CAPTURING;
  const complete = sdk && state?.phase === sdk.Phase.COMPLETE;
  const failed = loadError || (sdk && state?.phase === sdk.Phase.FAILED);

  return (
    <section>
      {failed && <p role="alert">Capture could not continue.</p>}
      {complete && <p>Capture complete.</p>}
      <video ref={video} autoPlay playsInline muted hidden={!active} />
      <button disabled={!ready} onClick={() => capture.current?.start()}>
        Start capture
      </button>
      {active && <button onClick={() => capture.current?.stop()}>Stop</button>}
    </section>
  );
}
