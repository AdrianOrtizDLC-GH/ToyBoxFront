import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from "../../shared/components/breadcrumb/breadcrumb";

@Component({
    selector: 'app-privacy',
    standalone: true,
    imports: [CommonModule, RouterModule, BreadcrumbComponent],
    templateUrl: './privacy.html',
    styleUrl: './privacy.css'
})
export class PrivacyComponent { }