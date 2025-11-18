import { Component } from '@angular/core';

@Component({
  selector: 'app-homepage',
  standalone: true,
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css'],
})
export class Homepage {
  isDarkMode = false;

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }
}
