import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
const serverConfig = {
    providers: [
        provideServerRendering(),
        provideServerRouting(serverRoutes)
    ]
};
export const config = mergeApplicationConfig(appConfig, serverConfig);
