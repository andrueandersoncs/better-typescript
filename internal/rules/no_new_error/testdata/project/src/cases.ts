const violation = new Error("failure")
class CustomError extends Error {}
const clean = new CustomError()
void violation
void clean
