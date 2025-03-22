import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
let AppComponent = class AppComponent {
    title = 'time-capsule';
};
AppComponent = __decorate([
    Component({
        selector: 'app-root',
        imports: [RouterOutlet],
        templateUrl: './app.component.html',
        styleUrl: './app.component.css'
    })
], AppComponent);
export { AppComponent };
