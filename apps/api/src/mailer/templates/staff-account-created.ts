interface StaffAccountCreatedTemplateInput {
  firstName: string;
  roleKey: 'manager' | 'kitchen' | 'cashier';
  loginUrl: string;
}

const ROLE_LABELS = {
  manager: 'Manager',
  kitchen: 'Kitchen',
  cashier: 'Cashier',
} as const;

export function renderStaffAccountCreated(input: StaffAccountCreatedTemplateInput): {
  html: string;
  text: string;
} {
  const role = ROLE_LABELS[input.roleKey];
  const safeName = escapeHtml(input.firstName);
  const safeLoginUrl = escapeHtml(input.loginUrl);

  return {
    html: `<p>Hi ${safeName},</p><p>Your Szef Donald admin account has been created with the <strong>${role}</strong> role.</p><p><a href="${safeLoginUrl}">Open the admin dashboard</a></p><p>Use the email address this message was sent to and the password provided by the restaurant owner. For security, passwords are never sent by email.</p>`,
    text: `Hi ${input.firstName},\n\nYour Szef Donald admin account has been created with the ${role} role.\n\nOpen the admin dashboard: ${input.loginUrl}\n\nUse this email address and the password provided by the restaurant owner. For security, passwords are never sent by email.`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
