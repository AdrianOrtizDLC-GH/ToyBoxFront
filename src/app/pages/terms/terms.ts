import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-terms',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './terms.html',
    styleUrl: './terms.css'
})
export class TermsComponent { }