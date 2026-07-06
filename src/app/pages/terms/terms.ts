import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from "../../shared/components/breadcrumb/breadcrumb";

/**
 * Static "Terms and Conditions" legal page.
 * Purely presentational: all content lives in terms.html, this component
 * has no state or logic beyond declaring the standalone module imports.
 */
@Component({
    selector: 'app-terms',
    standalone: true,
    imports: [CommonModule, RouterModule, BreadcrumbComponent],
    templateUrl: './terms.html',
    styleUrl: './terms.css'
})
export class TermsComponent { }