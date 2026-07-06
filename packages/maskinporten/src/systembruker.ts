export interface SystembrukerAuthorizationDetails {
  type: 'urn:altinn:systemuser';
  systemuser_org: {
    authority: 'iso6523-actorid-upis';
    ID: string;
  };
}

export const createSystembrukerAuthorizationDetails = (
  systemUserOrg: string,
): [SystembrukerAuthorizationDetails] => [
  {
    type: 'urn:altinn:systemuser',
    systemuser_org: {
      authority: 'iso6523-actorid-upis',
      ID: systemUserOrg,
    },
  },
];
