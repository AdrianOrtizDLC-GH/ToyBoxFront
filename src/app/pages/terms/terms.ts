import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from "../../shared/components/breadcrumb/breadcrumb";

@Component({
    selector: 'app-terms',
    standalone: true,
    imports: [CommonModule, RouterModule, BreadcrumbComponent],
    templateUrl: './terms.html',
    styleUrl: './terms.css'
})
export class TermsComponent { }