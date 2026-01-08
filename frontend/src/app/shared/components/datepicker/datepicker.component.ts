import { Component, Input, Output, EventEmitter, signal, computed, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CalendarDay {
  day: number;
  date: Date;
  currentMonth: boolean;
  selected: boolean;
  isToday: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss']
})
export class DatepickerComponent implements OnInit, OnChanges {
  @Input() value = '';
  @Input() placeholder = 'Selecciona una fecha';
  @Input() minDate = '';
  @Output() valueChange = new EventEmitter<string>();

  // Estados
  showCalendar = signal(false);
  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());
  selectedDate = signal<Date | null>(null);
  internalValue = signal(''); // ← AGREGAR ESTA LÍNEA

  // Días de la semana
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Meses
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // ← AGREGAR ngOnInit
  ngOnInit(): void {
    if (this.value) {
      this.internalValue.set(this.value);
      const date = new Date(this.value);
      this.currentMonth.set(date.getMonth());
      this.currentYear.set(date.getFullYear());
      this.selectedDate.set(date);
    }
  }

  // ← AGREGAR ngOnChanges
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && changes['value'].currentValue) {
      this.internalValue.set(changes['value'].currentValue);
      const date = new Date(changes['value'].currentValue);
      this.selectedDate.set(date);
    }
  }

  // Valor formateado
  formattedValue = computed(() => {
    const val = this.internalValue() || this.value;
    if (val) {
      const date = new Date(val);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return '';
  });

  // Días del calendario
  calendarDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDateTime = 0;
    if (this.minDate) {
      const minDateObj = new Date(this.minDate);
      minDateObj.setHours(0, 0, 0, 0);
      minDateTime = minDateObj.getTime();
    }

    // Obtener la fecha seleccionada actual
    const currentSelected = this.internalValue() || this.value;

    // Días del mes anterior
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevLastDay.getDate() - i;
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date,
        currentMonth: false,
        selected: false,
        isToday: false,
        disabled: true
      });
    }

    // Días del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateString = this.formatDate(date);
      const isToday = date.getTime() === today.getTime();
      const isDisabled = minDateTime > 0 && date.getTime() < minDateTime;
      
      days.push({
        day,
        date,
        currentMonth: true,
        selected: currentSelected === dateString, // ← USAR currentSelected
        isToday,
        disabled: isDisabled
      });
    }

    // Días del mes siguiente
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        day,
        date,
        currentMonth: false,
        selected: false,
        isToday: false,
        disabled: true
      });
    }

    return days;
  });

  // Toggle calendario
  toggleCalendar(): void {
    this.showCalendar.update(v => !v);
    
    if (this.showCalendar()) {
      const val = this.internalValue() || this.value;
      if (val) {
        const date = new Date(val);
        this.currentMonth.set(date.getMonth());
        this.currentYear.set(date.getFullYear());
      }
    }
  }

  // Cerrar calendario
  closeCalendar(): void {
    this.showCalendar.set(false);
  }

  // Mes anterior
  previousMonth(): void {
    const month = this.currentMonth();
    const year = this.currentYear();
    
    if (month === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(year - 1);
    } else {
      this.currentMonth.set(month - 1);
    }
  }

  // Mes siguiente
  nextMonth(): void {
    const month = this.currentMonth();
    const year = this.currentYear();
    
    if (month === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(year + 1);
    } else {
      this.currentMonth.set(month + 1);
    }
  }

  // ← ACTUALIZAR ESTE MÉTODO
  selectDate(day: CalendarDay): void {
    if (!day.currentMonth || day.disabled) return;
    
    const dateString = this.formatDate(day.date);
    console.log('Fecha seleccionada:', dateString); // ← DEBUG
    
    this.internalValue.set(dateString);
    this.selectedDate.set(day.date);
    this.valueChange.emit(dateString);
    
    console.log('Valor emitido:', dateString); // ← DEBUG
    
    // Cerrar después de un pequeño delay para ver la selección
    setTimeout(() => {
      this.closeCalendar();
    }, 200);
  }

  // Obtener etiqueta del mes y año
  getMonthYearLabel(): string {
    return `${this.monthNames[this.currentMonth()]} ${this.currentYear()}`;
  }

  // Formatear fecha a YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}