# Mangalsaath Live Demo Control

This release is designed to be deployed to the live Mangalsaath application while remaining public-safe by default.

## Operating model

- The upgraded code may be live while synthetic/demo profile visibility remains OFF.
- Only a fully verified Super Admin can enable, schedule, extend, disable, or emergency-lock the demo window.
- Demo profile presentation is controlled by explicit time windows and automatically expires.
- Synthetic/demo profile metadata remains visible inside Super Admin tooling only.
- Demo interactions remain disabled unless explicitly enabled by Super Admin.
- Emergency Lockdown immediately disables the demo control and hides all demo profiles.
- All control changes are audit logged.

## Public safety

A live test that exposes synthetic identities should be conducted only in a controlled, access-restricted client testing window. Outside that window, demo profiles must remain hidden from normal public discovery.

## Deployment

Hostinger tracks the `main` branch. The upgrade branch is merged to `main` only after validation. The feature is designed to default to OFF after deployment, allowing the Super Admin to choose the exact live-test window from the control center.
