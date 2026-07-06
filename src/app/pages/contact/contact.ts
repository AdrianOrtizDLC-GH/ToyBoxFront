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
/**
 * Static page component displaying the contact form and contact information.
 * Currently holds no logic; the form has no submit handler wired up yet.
 */
export class ContactComponent { }