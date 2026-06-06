import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang='es'>
      <head>
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, shrink-to-fit=no'
        />
        <meta
          name='description'
          content='Zigzag arma ideas cercanas e itinerarios City Day con IA.'
        />
        <meta name='theme-color' content='#0f172a' />
        <link rel='icon' href='/favicon.png' />
        <link rel='apple-touch-icon' href='/logo192.png' />
        <link rel='manifest' href='/manifest.json' />
        <title>Zigzag</title>
        <ScrollViewStyleReset />
        <script src='/register-service-worker.js' defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
