import { Module } from "@nestjs/common";
import { EmployeesController } from "./employees/employees.controller.js";
import { EmployeesService } from "./employees/employees.service.js";
import {
  BranchesController,
  DepartmentsController,
  PositionsController,
} from "./org-structure/org-structure.controllers.js";

// People and the structure they sit in: employees, departments, positions, branches.
@Module({
  controllers: [EmployeesController, DepartmentsController, PositionsController, BranchesController],
  providers: [EmployeesService],
})
export class PeopleModule {}
