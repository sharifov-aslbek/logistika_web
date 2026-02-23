// src/@types/dashboard.ts

export interface DashboardStats {
    total: number
    value: number
    label: string
}

export interface MailDashboardResponse {
    monthlyStats: DashboardStats[]
    yearlyStats: DashboardStats[]
    mailStatusDistribution: {
        labels: string[]
        data: number[]
    }
    recentMails: any[] // Replace 'any' with your Mail interface if you have it
}
