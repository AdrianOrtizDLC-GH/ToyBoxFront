import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from "../../shared/components/breadcrumb/breadcrumb";

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, BreadcrumbComponent],
    templateUrl: './contact.html',
    styleUrl: './contact.css'
})
export class ContactComponent { }