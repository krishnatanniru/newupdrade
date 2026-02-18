import { Attendance, User, PayrollRecord, Shift } from '../../types';

// Constants
export const MAX_HOURS_PER_DAY = 9;
export const OVERTIME_RATE = 1.5;
export const DAYS_FOR_WEEK_OFF = 6;
export const HOURS_PER_WEEK_OFF = 9;
export const HOURS_PER_HOLIDAY = 9;

// Parse time string (HH:mm) to minutes
export const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Format minutes to HH:mm
export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Calculate hours between two times
export const calculateHours = (timeIn: string, timeOut: string): number => {
  const inMinutes = parseTime(timeIn);
  const outMinutes = parseTime(timeOut);
  return Math.round((outMinutes - inMinutes) / 60 * 100) / 100;
};

// Get holidays for a month (simplified - can be enhanced with actual holiday data)
export const getHolidaysForMonth = (year: number, month: number): number => {
  // Default: 1 holiday per week (Sunday) + 1 national holiday per month
  const daysInMonth = new Date(year, month, 0).getDate();
  const sundays = Math.floor(daysInMonth / 7);
  return sundays + 1; // Sundays + 1 national holiday
};

// Check if a date is the user's week off day
export const isWeekOff = (dateStr: string, weekOffDay: number = 0): boolean => {
  const date = new Date(dateStr);
  return date.getDay() === weekOffDay; // 0 = Sunday, 1 = Monday, etc.
};

// Calculate daily salary for a single attendance record
export const calculateDailySalary = (
  attendance: Attendance,
  hourlyRate: number
): { 
  basePay: number; 
  totalHours: number;
  payableHours: number;
} => {
  if (!attendance.timeOut) {
    return { basePay: 0, totalHours: 0, payableHours: 0 };
  }

  const totalHours = attendance.hoursWorked || calculateHours(attendance.timeIn, attendance.timeOut);

  // Cap at max hours per day for base pay (no overtime)
  const payableHours = Math.min(totalHours, MAX_HOURS_PER_DAY);

  const basePay = payableHours * hourlyRate;

  return { basePay, totalHours, payableHours };
};

// Calculate week off eligibility and pay
export const calculateWeekOffPay = (
  totalDaysWorked: number,
  hourlyRate: number
): { weekOffsEarned: number; weekOffPay: number } => {
  const weekOffsEarned = Math.floor(totalDaysWorked / DAYS_FOR_WEEK_OFF);
  const weekOffPay = weekOffsEarned * HOURS_PER_WEEK_OFF * hourlyRate;
  return { weekOffsEarned, weekOffPay };
};

// Calculate holiday pay - only for holidays actually worked
export const calculateHolidayPay = (
  attendances: Attendance[],
  hourlyRate: number,
  holidays: { date: string }[] = [],
  weekOffDay: number = 0
): number => {
  // Create a set of holiday dates for quick lookup
  const holidayDates = new Set(holidays.map(h => h.date));
  
  // Count attendances on holidays (from database) or week off days
  const holidaysWorked = attendances.filter(a => {
    // Check if this date is a company/branch holiday OR user's week off day
    const isHoliday = holidayDates.has(a.date);
    const isUserWeekOff = isWeekOff(a.date, weekOffDay);
    return (isHoliday || isUserWeekOff) && a.timeOut;
  }).length;
  
  return holidaysWorked * HOURS_PER_HOLIDAY * hourlyRate;
};

// Calculate commission from class completions
export const calculateCommission = (
  userId: string,
  bookings: any[],
  commissionPercentage: number
): number => {
  // Get completed bookings for this trainer
  const completedSessions = bookings.filter(
    b => b.trainerId === userId && b.status === 'COMPLETED'
  );
  
  // Calculate commission (simplified - can be enhanced with actual commission logic)
  // Assuming average session value of ₹500 for calculation
  const avgSessionValue = 500;
  const totalCommission = completedSessions.length * avgSessionValue * (commissionPercentage / 100);
  
  return Math.round(totalCommission);
};

// Generate monthly payroll for a user
export const generateMonthlyPayroll = (
  user: User,
  attendances: Attendance[],
  year: number,
  month: number,
  bookings: any[] = [],
  holidays: { date: string }[] = []
): PayrollRecord => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const hourlyRate = user.hourlyRate || 0;
  const userWeekOffDay = user.weekOffDay ?? 0; // Default to Sunday if not set
  
  // Filter attendances for this month
  const monthAttendances = attendances.filter(a => {
    const attMonth = a.date.substring(0, 7);
    return a.userId === user.id && attMonth === monthStr && a.type === 'STAFF';
  });

  // Calculate totals (excluding week off days and holidays)
  let totalDaysWorked = 0;
  let totalHoursWorked = 0;
  let lateDays = 0;
  let earlyOutDays = 0;
  let baseSalary = 0;

  // Create a set of holiday dates for quick lookup
  const holidayDates = new Set(holidays.map(h => h.date));

  monthAttendances.forEach(attendance => {
    if (attendance.timeOut) {
      // Skip if this is user's week off day or a holiday (those are calculated separately)
      const isUserWeekOff = isWeekOff(attendance.date, userWeekOffDay);
      const isHoliday = holidayDates.has(attendance.date);
      
      if (!isUserWeekOff && !isHoliday) {
        const daily = calculateDailySalary(attendance, hourlyRate);
        totalDaysWorked++;
        totalHoursWorked += daily.totalHours;
        baseSalary += daily.basePay;
      }

      if (attendance.isLate) lateDays++;
      if (attendance.isEarlyOut) earlyOutDays++;
    }
  });

  // Calculate week off pay
  const { weekOffsEarned, weekOffPay } = calculateWeekOffPay(totalDaysWorked, hourlyRate);

  // Calculate holiday pay (for holidays and week off days actually worked)
  const holidayPay = calculateHolidayPay(monthAttendances, hourlyRate, holidays, userWeekOffDay);

  // Calculate commission
  const commissionEarned = calculateCommission(user.id, bookings, user.commissionPercentage || 0);

  // Calculate totals (no overtime)
  const totalEarnings = baseSalary + weekOffPay + holidayPay + commissionEarned;
  const deductions = 0; // Can be enhanced with tax, PF, etc.
  const netPay = totalEarnings - deductions;

  return {
    id: `payroll-${user.id}-${monthStr}`,
    userId: user.id,
    month: monthStr,
    year,
    totalDaysWorked,
    totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
    lateDays,
    earlyOutDays,
    overtimeHours: 0, // No overtime
    weekOffsTaken: weekOffsEarned,
    holidaysWorked: 0, // Can track if worked on holidays
    baseSalary: Math.round(baseSalary),
    weekOffPay: Math.round(weekOffPay),
    holidayPay: Math.round(holidayPay),
    overtimePay: 0, // No overtime
    commissionEarned: Math.round(commissionEarned),
    bonus: 0,
    totalEarnings: Math.round(totalEarnings),
    deductions: Math.round(deductions),
    netPay: Math.round(netPay),
    status: 'DRAFT',
    branchId: user.branchId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Get shift summary for display
export const getShiftSummary = (shifts: Shift[]): string => {
  if (!shifts || shifts.length === 0) return 'No shifts assigned';
  return shifts.map((s, i) => `Shift ${i + 1}: ${s.start}-${s.end}`).join(', ');
};

// Check if current time is within shift (with 30 min early window)
export const isWithinShift = (currentTime: string, shift: Shift): boolean => {
  const currentMinutes = parseTime(currentTime);
  const startMinutes = parseTime(shift.start);
  const endMinutes = parseTime(shift.end);
  const earlyWindow = startMinutes - 30;
  return currentMinutes >= earlyWindow && currentMinutes <= endMinutes;
};
