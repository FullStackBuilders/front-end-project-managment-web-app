export function memberFullName(member) {
  return `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || `User #${member.id}`;
}
