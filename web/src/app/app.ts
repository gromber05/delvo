import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Homepage } from './components/homepage/homepage';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Homepage
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = signal('delvo-web');
}
