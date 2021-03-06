import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Grid, Button, Glyphicon, Modal, Row, Col, ControlLabel, OverlayTrigger, Tooltip, FormControl, Alert } from 'react-bootstrap';
import DatePicker from 'react-bootstrap-date-picker';
import {findDOMNode} from 'react-dom';
import moment from 'moment';
import styles from './tasks-manager-quick-v3.module.scss';
import update from 'immutability-helper';
import SavingSpinner from '../saving-spinner/saving-spinner';
import { LocationMapV2 } from '../../components';
import { TaskWrapper } from '../index';
import {getStatusDetails} from '../../helpers/status_dict_lookup';
import {
  generateSingleLineAddress,
  getErrorMessage,
  makeTaskGroups,
  makeTaskGroupsUsingRouteId
} from '../../helpers/task';
import {getEntities, getTasks, getTemplates} from '../../actions';
import {extraFieldsOptions} from '../../helpers';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import { FieldGroup } from '../fields';
import { faCaretDown, faCaretLeft, faCaretRight, faAngleDown, faAngleUp, faPlus, faEye, faEyeSlash, faChevronLeft, faChevronRight } from '@fortawesome/fontawesome-free-solid';
import cx from 'classnames';
import { parseQueryParams } from '../../helpers';
import ErrorAlert from '../error-alert/error-alert';
import TeamEquipmentForm from '../team-equipment-form/team-equiment-form';
import DropdownFilter from '../dropdown-filter/dropdown-filter';
import SwitchButton from '../../helpers/switch_button';
import {toast, ToastContainer} from 'react-toastify';
import $ from 'jquery';

const errorMsg = (error) => {
  return getErrorMessage(error);
};

window.map = true;

class TasksManagerQuick extends Component {
  constructor(props) {
    super(props);

    this.clearAllFilters = this.clearAllFilters.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.createNewTask = this.createNewTask.bind(this);
    this.getEmptyText = this.getEmptyText.bind(this);
    this.onTaskClick = this.onTaskClick.bind(this);
    this.selectedTaskFilterChanged = this.selectedTaskFilterChanged.bind(this);
    this.entityFilterChanged = this.entityFilterChanged.bind(this);
    this.equipmentFilterChanged = this.equipmentFilterChanged.bind(this);
    this.taskAddedCallback = this.taskAddedCallback.bind(this);
    this.taskAssigneeUpdatedCallback = this.taskAssigneeUpdatedCallback.bind(this);
    this.taskEquipmentUpdatedCallback = this.taskEquipmentUpdatedCallback.bind(this);
    this.taskDeletedCallback = this.taskDeletedCallback.bind(this);
    this.taskStatusUpdateCallback = this.taskStatusUpdateCallback.bind(this);
    this.taskUpdatedCallback = this.taskUpdatedCallback.bind(this);
    this.fetchTasksAndEntitiesList = this.fetchTasksAndEntitiesList.bind(this);
    this.isAnyFilterEnabled = this.isAnyFilterEnabled.bind(this);
    this.taskHover  = this.taskHover.bind(this);
    this.taskHoverClose = this.taskHoverClose.bind(this);
    this.markerHover = this.markerHover.bind(this);
    this.markerHoverClose = this.markerHoverClose.bind(this);

    this.onChangeDate = this.onChangeDate.bind(this);
    this.moveDate = this.moveDate.bind(this);
    this.showDatePicker = this.showDatePicker.bind(this);
    this.getEntity = this.getEntity.bind(this);
    this.handleMapVisibility = this.handleMapVisibility.bind(this);
    this.handleTaskTypeChange = this.handleTaskTypeChange.bind(this);
    this.startAsyncUpdate = this.startAsyncUpdate.bind(this);
    this.visibilityChanged = this.visibilityChanged.bind(this);
    this.clearAsyncUpdate = this.clearAsyncUpdate.bind(this);
    this.getUniqueStatusesFromTemplates = this.getUniqueStatusesFromTemplates.bind(this);
    this.paginationPrevClicked = this.paginationPrevClicked.bind(this);
    this.paginationNextClicked = this.paginationNextClicked.bind(this);
    this.onTaskGroupClick = this.onTaskGroupClick.bind(this);
    this.groupsFilterChanged = this.groupsFilterChanged.bind(this);
    this.collapseFilter = this.collapseFilter.bind(this);
    this.filterTasksAndUpdateGroups = this.filterTasksAndUpdateGroups.bind(this);
    this.createToastNotification = this.createToastNotification.bind(this);
    this.getAjaxCall = this.getAjaxCall.bind(this);
    this.onRouteAssignClick = this.onRouteAssignClick.bind(this);
    this.onAssignmentModalClose = this.onAssignmentModalClose.bind(this);

    this.state = {
      showModal: false,
      loadingTasks: false,
      date: this.initializeDate(),
      tasks: [],
      entities: [],
      filteredEntiyList: [],
      selectedTask: null,
      selectedTasksFilter: [],
      selectedEntitiesFilter: [],
      selectedEquipmentsFilter: [],
      selectedGroupsFilter: [],
      newEventIsRecurring: false,
      templates: [],
      statuses: this.props.statuses,
      defaultTemplate: null,
      filterStatuses: [],
      timer: null,
      hoverCheck:false,
      taskHoverMarker: false,
      routeIdMarker:null,
      taskIdMarker:null,
      page: 1,
      items_per_page: 100,
      selectedGroup: null,
      taskGroup: null,
      loadingRoutes: false,
      showFilters: false,
      internetIssue: undefined,
      filteredTasks: [],
      taskGroups: [],
      task_ids: [],
      showEntitiesWarning: false,
      showEquipmentsWarning: false,
      showAssignmentModal: false
    };
  }

  componentDidMount() {
    this.setTimer = true;
    document.addEventListener('visibilitychange', this.visibilityChanged);
    const promises = [];

    promises.push(
      getTemplates().then((templates) => {
        const parsedTemplate = JSON.parse(templates);
        let defaultTemplate = null;
        parsedTemplate.map((template) => {
          if (template.is_default) {
            defaultTemplate = template;
          };
        });
        this.setState({
          templates: parsedTemplate,
          defaultTemplate,
          loadingTasks: false,
          blockingLoadTasks: false,
          filterStatuses: this.getUniqueStatusesFromTemplates(parsedTemplate),
        }, () => {
          this.fetchTasksAndEntitiesList(true);
        });
      }).catch((err) => {
        if (err.status === 400) {
          this.fetchTasksAndEntitiesList(true);
        }
      })
    );

    Promise.all(promises).then(() => {
      this.setState({
        loadingTask: false,
        blockingLoadTasks: false,
      }, () => {
        return null;
      });
    });

  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.date !== null && typeof nextProps.date !== 'undefined') {
      this.setState({
        date: nextProps.date
      });
    }
  }

  componentWillUnmount() {
    this.setTimer = false;
    this.clearAsyncUpdate();
    document.removeEventListener('visibilitychange', this.visibilityChanged);
  }

  filterTasksAndUpdateGroups(updateState = true, tasks = this.state.tasks) {
    let filteredTasks = [];
    if (this.state.selectedTasksFilter.length === 0 ||
      this.state.selectedTasksFilter.indexOf('All') >= 0) {
      filteredTasks = tasks;
    } else {
      filteredTasks = tasks
        .filter(task =>
          this.state.selectedTasksFilter.some(taskFilter => (task.status_title !== null ? taskFilter.toUpperCase() === task.status_title.toUpperCase() : taskFilter.toUpperCase() === task.status.toUpperCase()))
        );
    }

    if (this.state.selectedEquipmentsFilter.length > 0 ||
      this.state.selectedEntitiesFilter.length > 0) {
      filteredTasks = filteredTasks
        .filter(task =>
          task.resource_ids.some(id => this.state.selectedEquipmentsFilter.indexOf(id) >= 0) ||
          this.state.selectedEntitiesFilter.length > 0 &&
          task.entity_ids.some(id => this.state.selectedEntitiesFilter.indexOf(id) >= 0) ||
          (task.entity_ids.length === 0 && this.state.selectedEntitiesFilter.indexOf(-1) >= 0));
    }

    if (this.state.selectedGroupsFilter.length > 0) {
      filteredTasks = filteredTasks.filter (eve => {
        return this.state.selectedGroupsFilter.indexOf(eve.group_id) >= 0;
      })
    }

    const tasksWithRouteId = filteredTasks.filter((task) => {
      return task.route_id;
    });
    const tasksWithOutRouteId = filteredTasks.filter((task) => {
      return !task.route_id;
    });

    let taskGroups = [];
    let taskGroupsWithoutRouteId = [];
    if (tasksWithRouteId) {
      taskGroups = makeTaskGroupsUsingRouteId(tasksWithRouteId);
    }
    if (tasksWithOutRouteId) {
      taskGroupsWithoutRouteId = makeTaskGroups(tasksWithOutRouteId);
    }
    taskGroups.push.apply(taskGroups, taskGroupsWithoutRouteId);

    if (updateState) {
      this.setState({
        taskGroups,
        filteredTasks
      });
    } else {
      return { filteredTasks, taskGroups }
    }
  }

  getAjaxCall(call) {
    this.callInProgress = call;
  }

	createToastNotification(notification) {
		toast(notification.text, notification.options);
	}

  paginationPrevClicked() {
    this.setState({
      loadingTasks: true
    });
    const localPageNum = this.state.page;
    const newPage = localPageNum - 1;
    if(localPageNum > 1) {
      this.setState({
        page: newPage,
      },
      () => this.fetchTasksAndEntitiesList());
    } else {
      this.setState({
        page: 1,
      },
      () => this.fetchTasksAndEntitiesList());
    }
  }

  paginationNextClicked() {
    this.setState({
      loadingTasks: true
    });
    const localPageNum = this.state.page;
    const newPage = localPageNum + 1;
    this.setState({
      page: newPage,
    },
    () => this.fetchTasksAndEntitiesList());
  }

  clearAsyncUpdate() {
    if (this.state.timer) {
      clearTimeout(this.state.timer);
    }
  }

  taskHover(entityId) {
    if (!this.state.hoverCheck) {
      this.setState({
        hoverCheck: true,
        routeIdMarker: entityId
      })
    }
  }

  taskHoverClose() {
    if (this.state.hoverCheck) {
      this.setState({
        hoverCheck: false,
        routeIdMarker: null
      })
    }
  }

  markerHover(taskId) {
    if (!this.state.taskHoverMarker) {
      this.setState({
        taskHoverMarker: true,
        taskIdMarker: taskId
      })
    }
  }

  markerHoverClose() {
    if (this.state.taskHoverMarker) {
      this.setState({
        taskHoverMarker: false,
        taskIdMarker: null
      })
    }
  }


  visibilityChanged() {
    if (document.hidden) {
      this.clearAsyncUpdate();
    } else {
      this.clearAsyncUpdate();
      this.startAsyncUpdate();
    }
  }

  startAsyncUpdate() {
    this.fetchTasksAndEntitiesList();
  }

  initializeDate() {
    const query = parseQueryParams(this.props.location.search);
    if (query.date) {
      const dateObject = moment(query.date);
      if (dateObject.isValid()) {
        return dateObject.toISOString();
      } else {
        return moment().toISOString();
      }
    } else if (this.props.date !== null) {
      return this.props.date;
    } else {
      return moment().toISOString();
    }
  }


  isAnyFilterEnabled() {
    return (
      this.state.selectedTasksFilter.length > 0 ||
      this.state.selectedEntitiesFilter.length > 0 ||
      this.state.selectedEquipmentsFilter.length > 0);
  }

  onRouteAssignClick(task_ids, showEntitiesWarning, showEquipmentsWarning) {
    this.setState({
      showAssignmentModal: true,
      task_ids,
      showEntitiesWarning,
      showEquipmentsWarning
    });
  }

  onAssignmentModalClose() {
   this.setState({
     showAssignmentModal: false,
     task_ids: [],
     showEntitiesWarning: false,
     showEquipmentsWarning: false
   }, () => {
     this.fetchTasksAndEntitiesList()
   });
  }

  handleTaskTypeChange(template_id) {
    if (template_id !== 'DEFAULT' && template_id !== null) {
      let selectedTemplate = null;
      const templates = [...this.state.templates];
      templates.map((template) => {
        const updatedTemplate = template_id;
        if (updatedTemplate === template.id) {
          selectedTemplate = template;
        }
      });
      if (selectedTemplate !== null) {
        this.setState((state) => {
          return {
            ...state,
            selectedTask: {
              ...state.selectedTask,
              template: template_id
            },
            statuses: selectedTemplate.status_data
          };
        });
      } else {
        this.setState({
          statuses: this.props.statuses
        });
      }
    } else {
      this.setState((state) => {
        return {
          ...state,
          selectedTask: {
            ...state.selectedTask,
            template: template_id
          },
          statuses: this.props.statuses
        };
      });
    }
  }

  getUniqueStatusesFromTemplates(templates) {
    const statuses = [];
    templates.map((statusArray) => {
      statusArray.status_data.map((status) => {
        if (statuses.map((e) => { return e.title; }).indexOf(status.title) === -1) {
          statuses.push(status);
        }
      });
    });
    return statuses;
  }

  renderTasksToShowOnMap(entities, taskGroups) {
    let filteredEntiyList = [];
    if (entities.length + taskGroups.length === 0) {
      return <div></div>;
    }
    let routeTitle = '';
    if (this.state.taskGroup !== null) {
      let routeTooltip = 'Route ';
      for (let i = 0; i < this.state.taskGroup[0].entity_ids.length; i++) {
        const taskEnity = entities.find((entity) => {
          return entity.id === this.state.taskGroup[0].entity_ids[i];
        });
        routeTooltip += taskEnity ? taskEnity.name : '';
        if (i < this.state.taskGroup[0].entity_ids.length - 1) {
          routeTooltip += ', ';
        }
      }
      routeTitle = routeTooltip;
    }
    const filteredData = [];
    let location = null;
    let routeId = null;
    let name = null;
    let address = null;
    const wayPoints = [];
    if (this.state.selectedGroup === null) {
      for (let i = 0; i < taskGroups.length; i++) {
        if (taskGroups[i][0].entity_ids) {
          filteredEntiyList.push(taskGroups[i][0].entity_ids);
        }
        if (taskGroups[i].length === 1) {
          // Fall back for the old tasks which don't have any valid value for 'current_destination'
          if (taskGroups[i][0].current_destination && taskGroups[i][0].current_destination.exact_location && taskGroups[i][0].current_destination.exact_location.lat) {
            location = taskGroups[i][0].current_destination.exact_location;
            name = taskGroups[i][0].current_destination.title;
            address = taskGroups[i][0].current_destination.complete_address;
          } else if (taskGroups[i][0].customer_exact_location && taskGroups[i][0].customer_exact_location.lat) {
            location = taskGroups[i][0].customer_exact_location;
            name = taskGroups[i][0].customer_name;
            address = taskGroups[i][0].customer_address;
          }
          if (location) {
            filteredData.push({
              location: location,
              name: name,
              id: taskGroups[i][0].id,
              time: taskGroups[i][0].start_datetime,
              address: address,
              color: taskGroups[i][0].extra_fields && taskGroups[i][0].extra_fields.task_color ? taskGroups[i][0].extra_fields.task_color : '#0693e3',
              type: 'customer'
            });
          }
        }
      }

      //Concat filtered entities
      filteredEntiyList = [].concat.apply([], filteredEntiyList);
      filteredEntiyList = filteredEntiyList.filter((value, index, array) => { return array.indexOf(value) === index });

      // The entities extracted from tasks are less than the ones in selected team filter
      if (filteredEntiyList.length != this.state.selectedEntitiesFilter.length) {
        this.state.selectedEntitiesFilter.map(id => {
          if (filteredEntiyList.indexOf(id) < 0) {
            filteredEntiyList.push(id);
          }
        });
      }

      // if (!this.isAnyFilterEnabled()) {
      //   this.state.entities.map(obj => {
      //     if (filteredEntiyList.indexOf(obj.id) < 0) {
      //       filteredEntiyList.push(obj.id);
      //     }
      //   });
      // }

      for (let i = 0; i < filteredEntiyList.length; i++) {
        const filtered_entity = this.getEntity(entities, filteredEntiyList[i]);
        if (filtered_entity && filtered_entity.lastreading) {
          filteredData.push({
            location: filtered_entity.lastreading,
            name: filtered_entity.name,
            id: filtered_entity.id,
            time: filtered_entity.lastreading.time,
            image_path: filtered_entity.image_path
          });
        }
      }
    } else {
      const tasks = this.state.taskGroup;
      const companyProfile = this.props.companyProfile;
      if (companyProfile.exact_location) {
        location = companyProfile.exact_location;
        name = companyProfile.fullname;
        address = companyProfile.address;
      } else if (companyProfile.address) {
        location = companyProfile.address;
        name = companyProfile.fullname;
        address = companyProfile.address;
      }
      let selectedGroup = null;
      if (this.props.groups) {
        for (let i = 0; i < tasks.length; i++) {
          selectedGroup = this.props.groups.find((group) => {
            return tasks[i].group_id === null ? group.is_implicit : tasks[i].group_id === group.id;
          });
          if (selectedGroup && selectedGroup.exact_location) {
            location = selectedGroup.exact_location;
            name = selectedGroup.name;
            address = selectedGroup.complete_address;
            break;
          } else if (selectedGroup && selectedGroup.address) {
            location = selectedGroup.complete_address;
            name = selectedGroup.name;
            address = selectedGroup.complete_address;
            break;
          }
        }
      }

      if (location) {
        filteredData.push({
          location: location,
          name: name,
          id: selectedGroup ? selectedGroup.owner :companyProfile.owner,
          time: null,
          address: address,
          color: companyProfile.color ? companyProfile.color : '#0693e3',
          is_company: true,
        });
        wayPoints.push({
          location: location,
        });
        location = null;
      }
      for (let i = 0; i < tasks.length; i++) {
        // find tasks of entity and get locations of task to show on map
            routeId = i + 1;
        if (tasks[i].current_destination && tasks[i].current_destination.exact_location && tasks[i].current_destination.exact_location.lat) {
          location = tasks[i].current_destination.exact_location;
          name = tasks[i].current_destination.title;
          address = tasks[i].current_destination.complete_address;
        } else if (tasks[i].customer_exact_location && tasks[i].customer_exact_location.lat) {
          location = tasks[i].customer_exact_location;
          name = tasks[i].customer_name;
          address = tasks[i].customer_address;
        } else if (tasks[i].customer_address) {
          location = tasks[i].customer_address;
          name = tasks[i].customer_name;
          address = tasks[i].customer_address;
        }
        if (location) {
          filteredData.push({
            location: location,
            name: name,
            id: tasks[i].id,
            routeId: routeId,
            time: tasks[i].start_datetime,
            address: address,
            color: tasks[i].extra_fields && tasks[i].extra_fields.task_color ? tasks[i].extra_fields.task_color : '#0693e3',
            type: 'customer'
          });
          wayPoints.push({
            location: location,
          });
        }
        location = null;
      }
    }

    return (
      <div>
        {this.state.loadingRoutes &&
          <div className={styles.routesSavingSpinner}>
            <SavingSpinner title="" borderStyle="none" fontColor={"#E6F4FF"} size={8}/>
          </div>
        }
        {!this.state.loadingRoutes && taskGroups.length !== 0 &&
          <div className={styles.nonRouteTasks}>
            {this.state.selectedGroup === null ? 'Non-route Tasks' : routeTitle}
          </div>
        }
        <LocationMapV2 height='calc(100vh - 200px)' routeView="routes" taskHoverMarker={this.state.taskHoverMarker} hoverCheck={this.state.hoverCheck}   taskHover={this.taskHover}  taskIdMarker={this.state.taskIdMarker}  taskHoverClose={this.taskHoverClose} entities={filteredData} showDirections={filteredData.length !== 0 ? this.state.selectedGroup !== null : false} showLocation wayPoints={wayPoints} hideOverlay={this.state.selectedGroup !== null}/>
      </div>
    );
  }

  fetchTasksAndEntitiesList(resetTimeout, blockingUpdate = false, postProcess = null) {
    if (this.state.timer && resetTimeout) {
      clearTimeout(this.state.timer);
    }

    if (this.callInProgress && this.callInProgress.state() === 'pending') {
      this.callInProgress.abort();
    }

    if (!this.state.showModal && !this.state.showAssignmentModal) {
      this.setState({
        loadingTasks: true,
        blockingLoadTasks: blockingUpdate
      });

      setTimeout(() => {
        const startDate = moment(this.state.date).startOf('day');
        const endDate = moment(this.state.date).endOf('day');
        const items_per_page = this.state.items_per_page;
        const page = this.state.page;

        Promise.all([getEntities(), this.props.getTasks({ viewType: null, startDate, endDate, items_per_page, page, getAjaxCall: this.getAjaxCall })])
          .then(([entities, tasks]) => {
            const parsedTasks = JSON.parse(tasks);
            const parsedEntities = JSON.parse(entities);
            const { filteredTasks, taskGroups } = this.filterTasksAndUpdateGroups(false, parsedTasks);
            this.setState({
              tasks: parsedTasks,
              loadingTasks: false,
              blockingLoadTasks: false,
              entities: parsedEntities,
              filteredTasks,
              taskGroups
            }, () => {
              return postProcess ? postProcess() : null;
            });
            const timer = setTimeout(() => {
              this.fetchTasksAndEntitiesList();
            }, 3e4);
            if (this.setTimer && !document.hidden) {
              this.setState({
                timer,
                internetIssue: typeof this.state.internetIssue !== 'undefined' ? false : undefined,
              });
            } else {
              clearTimeout(timer);
            }
          }).catch((err) => {
          console.log(err);
          if (err.status === 0 && err.statusText === 'error') {
            this.setState({
              internetIssue: true,
              loadingTasks: false,
              blockingLoadTasks: false,
            });
          }
        });
      }, 200);
    }
  }

  onTaskClick(e, task) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      selectedTask: task,
      showModal: true
    });
    if (task.template) {
      this.handleTaskTypeChange(task.template);
    } else {
      this.setState({
        statuses: this.props.statuses
      });
    }
  }

  getEntity(entities, entityId) {
    return entities.find((entity) => {
      return entityId === entity.id;
    });
  }

  handleMapVisibility() {
    if (!window.map) {
      window.map = true;
      this.forceUpdate();
    } else {
      window.map = false;
      this.forceUpdate();
    }
  }

  clearAllFilters(e) {
    e.preventDefault();
    const eObj = {
      target: {name: 'deselect-all'},
      stopPropagation: () => {
      },
      preventDefault: () => {
      }
    }
    if (typeof this.equipmentFilterInstance !== 'undefined' && this.equipmentFilterInstance !== null) {
      this.equipmentFilterInstance.handleClick(eObj);
    }
    if (typeof this.entityFilterInstance !== 'undefined' && this.entityFilterInstance !== null) {
      this.entityFilterInstance.handleClick(eObj);
    }
    if (typeof this.statusFilterInstance !== 'undefined' && this.statusFilterInstance !== null) {
      this.statusFilterInstance.handleClick(eObj);
    }
    if (typeof this.groupsFilter !== 'undefined' && this.groupsFilter !== null) {
      this.groupsFilter.handleClick(eObj);
    }
  }

  closeModal() {
    this.setState({
      showModal: false
    },() => this.fetchTasksAndEntitiesList(true));
  }
  //TODO: Filter tasks and update groups inline
  entityFilterChanged(selectedEntities) {
    this.setState({selectedEntitiesFilter: selectedEntities.map(item => item.id)}, () => {
      this.filterTasksAndUpdateGroups();
    });
  }

  equipmentFilterChanged(selectedEquipments) {
    this.setState({selectedEquipmentsFilter: selectedEquipments.map(item => item.id)}, () => {
      this.filterTasksAndUpdateGroups();
    });
  }

  selectedTaskFilterChanged(selectedStatuses) {
    this.setState({
      selectedTasksFilter: selectedStatuses.map(item => item.title ? item.title : item.id)
    }, () => {
      this.filterTasksAndUpdateGroups();
    });
  }

  groupsFilterChanged(selectedGroups) {
    this.setState({
      selectedGroupsFilter: selectedGroups.map(group => group.id)
    }, () => {
      this.filterTasksAndUpdateGroups();
    });
  }

  moveDate(e) {
    let direction = e.target.closest('.icon-direction').dataset.direction,
      currentDate = new Date(this.state.date),
      dateValue;
    if (direction == 'left') {
      dateValue = currentDate.getDate() - 1;
    } else if (direction == 'right') {
      dateValue = currentDate.getDate() + 1;
    }
    currentDate.setDate(dateValue);
    this.props.onDateChanged(currentDate.toISOString());
    this.setState({
      selectedGroup: null,
      taskGroup: null,
      loadingRoutes: false
    });
    this.fetchTasksAndEntitiesList(true, true);
  }

  onChangeDate(value) {
    this.props.onDateChanged(value);
    this.setState({
      selectedGroup: null,
      taskGroup: null,
      loadingRoutes: false
    });
    this.fetchTasksAndEntitiesList(true, true);
  }

  showDatePicker() {
    findDOMNode(this.refs.dateInput).getElementsByTagName('input')[1].focus();
  }

  taskStatusUpdateCallback(id, status) {
    if (status.type !== 'CUSTOM') {
      const {tasks} = this.state;
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === id) {
          tasks[i].status = status.type;
          this.forceUpdate();
          return;
        }
      }
    }
  }

  getTaskIndexInEventsList(task) {
    return this.getTaskIndexInEventsListUsingId(task.id);
  }

  getTaskIndexInEventsListUsingId(task_id) {
    let index = -1;

    for (let i = 0; i < this.state.tasks.length; i++) {
      if (this.state.tasks[i].id === task_id) {
        index = i;
      }
    }

    return index;
  }

  conformTaskToServerReturnedStructure(task) {
    if ($.type(task.entity_ids) === "string") {
      const array = task.entity_ids.split(',');
      const int_array = [];
      for (let i = 0; i < array.length; i++) {
        if (array[i] !== "") {
          int_array.push(parseInt(array[i], 10));
        }
      }

      task.entity_ids = int_array;
    }

    if ($.type(task.resource_ids) === "string") {
      const array = task.resource_ids.split(',');
      const int_array = [];
      for (let i = 0; i < array.length; i++) {
        if (array[i] !== "") {
          int_array.push(parseInt(array[i], 10));
        }
      }

      task.resource_ids = int_array;
    }

    if ($.type(task.document_ids) === "string") {
      const array = task.document_ids.split(',');
      const int_array = [];
      for (let i = 0; i < array.length; i++) {
        if (array[i] !== "") {
          int_array.push(parseInt(array[i], 10));
        }
      }
      task.document_ids = int_array;
    }

    if ($.type(task.template_extra_fields) === 'string') {
      const template_extra_fields = JSON.parse(task.template_extra_fields);
      task.template_extra_fields = template_extra_fields;
    }

    if ($.type(task.extra_fields) === "string") {
      const extra_fields = JSON.parse(task.extra_fields);
      task.extra_fields = extra_fields;
    }

    if ($.type(task.notifications) === "string") {
      const notifications = JSON.parse(task.notifications);
      task.notifications = notifications;
    }

    if ($.type(task.customer_exact_location) === "string") {
      const customer_exact_location = JSON.parse(task.customer_exact_location);
      task.customer_exact_location = customer_exact_location;
    }

    if($.type(task.additional_addresses) === "string") {
      const additional_addresses = JSON.parse(task.additional_addresses);
      task.additional_addresses = additional_addresses;
    }

    task.customer_address = generateSingleLineAddress(task);

    return task;
  }

  duplicateTask(task) {
    const duplicatedTask = {};
    Object.assign(duplicatedTask, task);
    duplicatedTask.id = null;
    duplicatedTask.title = 'Copy of ' + duplicatedTask.title;
    duplicatedTask.series_id = null;
    duplicatedTask.url_safe_id = null;
    duplicatedTask.status = 'NOTSTARTED';
    setTimeout((e) => {
      this.createNewTask(duplicatedTask)
    }, 2e3);
  }

  taskUpdatedCallback(task, createDuplicate = false, tasksFetchRecommended = false) {
    const index = this.getTaskIndexInEventsList(task);

    if (index === -1) {
      console.log('updated task is not found in list of events. This could be an error or the task is deleted from server.');
    }

    if (task.series_settings || tasksFetchRecommended) {
      const postProcess = () => {
        if (createDuplicate === true) {
          this.duplicateTask(this.conformTaskToServerReturnedStructure(task));
        }
      };
      this.fetchTasksAndEntitiesList(true, true, postProcess);
    } else {
      const postProcess = () => {
        if (createDuplicate === true) {
          this.duplicateTask(task);
        }
      };
      this.setState({
        tasks: index !== -1 ? update(this.state.tasks, {
          [index]: {$set: this.conformTaskToServerReturnedStructure(task)}
        }) : this.state.tasks
      }, postProcess);
    }

    this.closeModal();
  }

  taskAddedCallback(task, createDuplicate = false, tasksFetchRecommended = false) {
    if (task.series_settings || tasksFetchRecommended) {
      const postProcess = () => {
        if (createDuplicate === true) {
          this.duplicateTask(this.conformTaskToServerReturnedStructure(task));
        }
      };
      this.fetchTasksAndEntitiesList(true, true, postProcess);
    } else {
      const task_date = moment(task.start_datetime);
      if (moment(this.state.date).isSame(task_date, 'd')) {
        const postProcess = () => {
          if (createDuplicate === true) {
            this.duplicateTask(task);
          }
        };

        this.setState({
          tasks: update(this.state.tasks, {$push: [this.conformTaskToServerReturnedStructure(task)]}),
          showModal: false
        }, postProcess);
      }
    }

    this.closeModal();
  }

  taskDeletedCallback(task_id, series_deleted) {
    const index = this.getTaskIndexInEventsListUsingId(task_id);
    if (index === -1) {
      console.log('deleted task is not found in list of events. This could be an error or the task is deleted from server.');
    }

    if (series_deleted) {
      this.fetchTasksAndEntitiesList(true, true);
    } else {
      this.setState({
        tasks: index !== -1 ? update(this.state.tasks, {
          $splice: [[index, 1]]
        }) : this.state.tasks
      });
    }

    this.closeModal();
  }

  taskAssigneeUpdatedCallback(entity_ids, task_id) {
    const index = this.getTaskIndexInEventsListUsingId(task_id);
    if (index === -1) {
      console.log('updated task is not found in list of events. This could be an error or the task is deleted from server.');
    }

    this.setState({
      tasks: index !== -1 ? update(this.state.tasks, {
        [index]: {entity_ids: {$set: entity_ids}}
      }) : this.state.tasks,
      selectedTask: update(this.state.selectedTask, {
        entity_ids: {$set: entity_ids}
      })
    });
  }

  taskEquipmentUpdatedCallback(resource_ids, task_id) {
    const index = this.getTaskIndexInEventsListUsingId(task_id);
    if (index === -1) {
      console.log('updated task is not found in list of events. This could be an error or the task is deleted from server.');
    }

    this.setState({
      tasks: index !== -1 ? update(this.state.tasks, {
        [index]: {resource_ids: {$set: resource_ids}}
      }) : this.state.tasks,
      selectedTask: update(this.state.selectedTask, {
        resource_ids: {$set: resource_ids}
      })
    });
  }

  createNewTask(task = null) {
    this.setState({
      showModal: true,
      selectedTask: task
    });
  }

  getEmptyText() {
    let emptyText;
    if (this.isAnyFilterEnabled()) {
      emptyText = "No tasks matching the criteria";
    } else {
      emptyText = "No tasks scheduled";
    }

    return (<div className={styles['no-entity']}>
      {emptyText}
    </div>);
  }

  onTaskGroupClick(selectedGroupNumber, taskGroup) {
    const oldSelectedGroup = this.state.selectedGroup;
    if (selectedGroupNumber === oldSelectedGroup) {
      this.setState({
        selectedGroup: null,
        taskGroup: null,
        loadingRoutes: false,
      });
    } else {
      this.setState({
        selectedGroup: selectedGroupNumber,
        taskGroup,
      });
    }
  }

  collapseFilter() {
    this.setState({
      showFilters: !this.state.showFilters
    });
  }

  render() {
    this.can_create = false;
    this.can_view_filters = false;
    this.can_view_group_filter = false;
    if (this.props.groups !== null && typeof this.props.groups !== 'undefined' && this.props.groups.length > 0) {
      const defaultGroup = this.props.groups.find((group) => {
        return group.is_implicit;
      });
      if (defaultGroup && this.props.groups.length > 1) {
        this.can_view_group_filter = true;
      } else if (!defaultGroup) {
        this.can_view_group_filter = true
      }
    }
    if (this.props.profile && this.props.profile.permissions) {
      let permissions = this.props.profile.permissions;
      let is_company = false;
      if (permissions.includes('COMPANY'))is_company = true;
      if (is_company || permissions.includes('ADD_TASK')) this.can_create = true;
      if (is_company || permissions.includes('VIEW_ALL_TASKS')) this.can_view_filters = true;
    }

    const filteredTasks = this.state.filteredTasks;
    const taskGroups = this.state.taskGroups;

    let prevDisabled = false;
    let nextDisabled = false;
    if (this.state.page === 1) {
      prevDisabled = true;
    }
    if (this.state.tasks.length < this.state.items_per_page) {
      nextDisabled = true;
    }

    let groups = $.extend(true, [], this.props.groups);
    groups && groups.map((group) => {
      if (group.is_implicit) {
        group.id = null;
      }
    });

    return (
      <div className={styles['tasks-manager-quick']}>
        <ErrorAlert errorText="No Internet Connection Available..." showError={this.state.internetIssue}/>
        <ToastContainer className={styles.toastContainer} toastClassName={styles.toast} autoClose={1} />
        <Grid>
          <Row className="filter-bar">
            <Col sm={12} md={4} className={styles['filter-left']}>
              <Row className={styles.datePicker}>
                <Col xs={1}>
                  <FontAwesomeIcon icon={faCaretLeft} data-direction="left" onClick={this.moveDate} className={cx(styles.icon + ' icon-direction', styles.newIcon)}/>
                </Col>
                <Col xs={8} sm={6} className={styles['date-calendar']}>
                  <h2>Tasks - <DatePicker id="start_date" value={moment(this.state.date).local().format()}
                                          onChange={this.onChangeDate} showClearButton={false} showTodayButton={true}
                                          ref="dateInput"/></h2>
                </Col>
                <Col smPull={1} xs={1}>
                  <FontAwesomeIcon icon={faCaretRight} data-direction="right" onClick={this.moveDate} className={cx(styles.icon + ' icon-direction', styles.newIcon)}/>
                </Col>
              </Row>
            </Col>
            {this.can_view_filters &&
            <Col sm={12} md={8} className={styles['filter-right']}>
              <div className={cx(styles.filters, this.state.showFilters ? styles.active : null)}>
                <div className="filters-title-max-width-cap" onClick={this.collapseFilter}>
                  <Glyphicon className={styles.icon} glyph="filter"/>
                  <ControlLabel>
                    Filter
                  </ControlLabel>
                </div>
                {this.can_view_group_filter &&
                <div className="filters-max-width-cap">
                  <DropdownFilter
                    name="groupFilter"
                    ref={instance => {
                      this.groupsFilter = instance;
                    }}
                    data={groups}
                    handleChange={this.groupsFilterChanged}
                    title="Groups"
                    searchable
                    minWidth="120px"/>
                </div>
                }
                <div className="filters-max-width-cap">
                  <DropdownFilter
                    name="statusFilter"
                    ref={instance => {
                      this.statusFilterInstance = instance;
                    }}
                    data={this.state.filterStatuses}
                    handleChange={this.selectedTaskFilterChanged}
                    title="Status"
                    searchable
                    minWidth="120px"/>
                </div>
                {this.props.equipments && this.props.equipments.length > 0 &&
                <div className="filters-max-width-cap">
                  <DropdownFilter
                    name="equipmentFilter"
                    ref={instance => {
                      this.equipmentFilterInstance = instance;
                    }}
                    data={this.props.equipments}
                    handleChange={this.equipmentFilterChanged}
                    title="Equipment"
                    searchable
                    minWidth="120px"/>
                </div>
                }
                <div className="filters-max-width-cap">
                  <DropdownFilter
                    name="entityFilter"
                    ref={instance => {
                      this.entityFilterInstance = instance;
                    }}
                    data={this.state.entities}
                    handleChange={this.entityFilterChanged}
                    title="Team"
                    minWidth="120px"
                    searchable
                    extraItem={{id: -1, name: 'Unassigned'}}/>
                </div>
                <div className={styles['clear-all']}>
                  <a style={{color: '#fff'}} onClick={this.clearAllFilters} href="javascript:void(0)">Clear All</a>
                </div>
              </div>
            </Col>}
          </Row>
          <Row>
            <Col xs={12} md={window.map ? 6 : 12} className={styles['tasksContainer']}>
              <Row  className={styles.buttonsContainer}>
                <Col lg={3} md={12}>
                  <div className={styles.dashboardSwitch}>
                    <p>Tasks</p>
                    <FieldGroup key="dashboardSwitch" name="dashboardSwitch" componentClass={SwitchButton} checked={(this.props.dashboardType === 'tasks' || !this.props.dashboardType) ? false : true} onChange={() => this.props.changeDashboard()}/>
                    <p>Routes</p>
                    <div className={styles.paginationLeft}>
                      {!this.state.blockingLoadTasks && this.state.loadingTasks && <div className={styles.loadingSpinner}>
                        <SavingSpinner title="" borderStyle="none" fontColor={"#E6F4FF"} size={8}/>
                      </div>}
                      {!this.state.loadingTasks && (this.state.tasks.length > 0 || this.state.page > 1) &&
                      <div className={styles.paginationContainer}>
                        <ul>
                          <li style={{ cursor: 'wait' }}>
                            <button disabled={prevDisabled} className={cx(prevDisabled && 'disabled', this.state.blockingLoadTasks && styles.pendingAction)} onClick={() => this.paginationPrevClicked()}>
                              <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                          </li>
                          <li style={{ cursor: 'wait' }}>
                            <button disabled={nextDisabled} className={cx(nextDisabled && 'disabled', this.state.blockingLoadTasks && styles.pendingAction)} onClick={() => this.paginationNextClicked()}>
                              <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                          </li>
                        </ul>
                        {this.state.blockingLoadTasks || this.state.tasks.length < 1
                          ?
                          <p>
                            {this.state.tasks.length}
                          </p>
                          :
                          <p>
                            {((this.state.page - 1) * this.state.items_per_page) + 1 } - { (this.state.page * this.state.items_per_page) - (this.state.items_per_page - this.state.tasks.length) }
                          </p>
                        }
                      </div>
                      }
                    </div>
                  </div>
                </Col>
                <Col lg={9} md={12}>
                  <div className={styles['task-bar']}>
                    {/*<p>{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found</p>*/}
                    <div className={styles.paginationRight}>
                      {!this.state.blockingLoadTasks && this.state.loadingTasks && <div className={styles.loadingSpinner}>
                        <SavingSpinner title="" borderStyle="none" fontColor={"#E6F4FF"} size={8}/>
                      </div>}
                      {!this.state.loadingTasks && (this.state.tasks.length > 0 || this.state.page > 1) &&
                      <div className={styles.paginationContainer}>
                        {this.state.blockingLoadTasks || this.state.tasks.length < 1
                          ?
                          <p>
                            {this.state.tasks.length}
                          </p>
                          :
                          <p>
                            {((this.state.page - 1) * this.state.items_per_page) + 1 } - { (this.state.page * this.state.items_per_page) - (this.state.items_per_page - this.state.tasks.length) }
                          </p>
                        }
                        <ul>
                          <li style={{ cursor: 'wait' }}>
                            <button disabled={prevDisabled} className={cx(prevDisabled && 'disabled', this.state.blockingLoadTasks && styles.pendingAction)} onClick={() => this.paginationPrevClicked()}>
                              <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                          </li>
                          <li style={{ cursor: 'wait' }}>
                            <button disabled={nextDisabled} className={cx(nextDisabled && 'disabled', this.state.blockingLoadTasks && styles.pendingAction)} onClick={() => this.paginationNextClicked()}>
                              <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                          </li>
                        </ul>
                      </div>
                      }
                    </div>
                    <div className={styles.subTaskBar}>
                      { this.can_create &&
                        <Button id="create-new-task-button" className={cx('btn-submit', styles.dashboardBtn)} onClick={(e) => this.createNewTask()}>
                          Create New Task <FontAwesomeIcon icon={faPlus} className={styles.icon} />
                        </Button>
                      }
                      <Button id="toggle-map" className={cx('btn-submit', styles.transparentButton, styles.dashboardBtn)}
                              onClick={this.handleMapVisibility}>
                        {window.map &&
                        <span>Hide Map <FontAwesomeIcon icon={faEyeSlash} className={styles.iconForTransparent}/></span>
                        }
                        {!window.map &&
                        <span>Show Map <FontAwesomeIcon icon={faEye} className={cx(styles.iconForTransparent)}/></span>
                        }
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
              {this.state.blockingLoadTasks &&
              <div className={styles.blockingPlaceHolder}><SavingSpinner title="" borderStyle="none" size={8}/></div>}
              {!this.state.blockingLoadTasks && <div className={styles['items-container']}>
                {
                  !this.state.loadingTasks && filteredTasks.length === 0 ? this.getEmptyText() : null
                }
                {
                  taskGroups.map((taskGroup, i) => {
                    return (
                      <div onClick={(e) => { taskGroup.length === 1 ? this.onTaskClick(e, taskGroup[0]) : this.onTaskGroupClick(i, taskGroup) }}>
                        {taskGroup.length === 1 ?
                          <TaskCard task={taskGroup[0]} itemkey={i}
                            showEntities={true}
                            singleTaskCard
                            entities={this.state.entities}
                            companyProfile={this.props.companyProfile}
                            profile={this.props.profile}
                            markerHover={this.markerHover}
                            markerHoverClose={this.markerHoverClose}
                          />
                          :
                          <RouteCard taskGroup={taskGroup} itemkey={i}
                           routeIdMarker={this.state.routeIdMarker}
                           markerHover={this.markerHover}
                           markerHoverClose={this.markerHoverClose}
                           showTasks={this.state.selectedGroup !== null && this.state.selectedGroup === i}
                           entities={this.state.entities} companyProfile={this.props.companyProfile}
                           profile={this.props.profile} onTaskClick={this.onTaskClick}
                           onAssignClick={this.onRouteAssignClick}
                          />
                        }
                      </div>
                    );
                  })
                }
              </div>
              }
            </Col>
            {window.map &&
            <Col xs={12} md={6} className={styles['mapContainer']}>
              {!this.state.blockingLoadTasks && this.renderTasksToShowOnMap(this.state.entities, taskGroups)}
            </Col>
            }
          </Row>

          <Modal show={this.state.showModal} onHide={this.closeModal} bsSize="large">
            <Modal.Header closeButton>
              <Modal.Title>{(this.state.selectedTask && typeof this.state.selectedTask !== 'undefined' && this.state.selectedTask.id !== null && typeof this.state.selectedTask.id !== 'undefined') ? this.state.selectedTask.title : 'New Task'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <TaskWrapper
                selectedTask={this.state.selectedTask}
                newEventIsRecurring={this.state.newEventIsRecurring}
                company_id={this.props.company_id}
                company_url={this.props.company_url}
                reporter_name={this.props.reporter_name}
                reporter_id={this.props.reporter_id}
                getTaskStatus={this.props.getStatus}
                getTaskRatings={this.props.getRatings}
                updateTaskStatus={this.props.setNewStatus}
                getEstimate={this.props.getEstimate}
                getSchedule={this.props.getSchedule}

                statuses={(this.state !== null && this.state.selectedTask !== null && this.state.selectedTask.template === null && this.props.profile !== null) ? this.props.profile.statuses : this.state.statuses }
                entities={this.state.entities}
                equipments={this.props.equipments}

                getCustomers={this.props.getCustomers}
                searchCustomers={this.props.searchCustomers}

                createCustomer={this.props.createCustomer}
                extraFieldsOptions={this.props.extraFieldsOptions}

                taskUpdatedCallback={this.taskUpdatedCallback}
                taskAddedCallback={this.taskAddedCallback}
                taskDeletedCallback={this.taskDeletedCallback}
                taskAssigneeUpdatedCallback={this.taskAssigneeUpdatedCallback}
                taskEquipmentUpdatedCallback={this.taskEquipmentUpdatedCallback}
                taskStatusUpdateCallback={this.taskStatusUpdateCallback}
                handleTaskTypeChange={this.handleTaskTypeChange}

                onCloseTask={this.closeModal}

                updateTask={this.props.updateTask}
                deleteTask={this.props.deleteTask}
                postTask={this.props.postTask}
                getTaskSeriesSettings={this.props.getTaskSeriesSettings}
                taskSendNotification={this.props.taskSendNotification}
                profile={this.props.profile}
                templates={this.state.templates}
                defaultTemplate={this.state.defaultTemplate}
                companyProfile={this.props.companyProfile}
                groups={this.props.groups}
                createToastNotification={this.createToastNotification}
              />
            </Modal.Body>
          </Modal>
          <TeamEquipmentForm
            closeModal={this.onAssignmentModalClose}
            showModal={this.state.showAssignmentModal}
            entities={this.state.entities}
            equipments={this.props.equipments}
            task_ids={this.state.task_ids}
            showEntitiesWarning={this.state.showEntitiesWarning}
            showEquipmentsWarning={this.state.showEquipmentsWarning}/>
        </Grid>
      </div>);
  }
}

class TaskCard extends Component {
  constructor(props) {
    super(props);
    this.toggleCard = this.toggleCard.bind(this);
    this.showEntityFaces = this.showEntityFaces.bind(this);
    this.state = {
      showFullCard: false
    };
  }

  getEntity(entityId) {
    return this.props.entities.find((entity) => {
      return entityId === entity.id;
    });
  }

  showEntityFaces(entity_ids, task_id, entityConfirmation) {
    if (!this.props.showEntities)
      return null;
    let is_company = false;
    if (this.props.profile.permissions && this.props.profile.permissions.includes('COMPANY')) is_company = true;
    if (is_company || this.props.profile.permissions.includes('VIEW_TEAM_CONFIRMATION_DATA')) this.can_view_team_confirmation = true;
    if (!this.props.entities) {
      return null;
    }

    let entityList = null;
    if (entity_ids && entity_ids.length > 0 && this.props.entities.length > 0) {
      entityList = entity_ids.map((entity_id, i) => {
        let borderColor = '#666666';
        let toolTipMessage = 'Pending Response';
        if (entityConfirmation && entityConfirmation.hasOwnProperty(entity_id) && entityConfirmation[entity_id].status === 'ACCEPTED') {
          borderColor = '#24ab95';
          toolTipMessage = 'Accepted';
        } else if (entityConfirmation && entityConfirmation.hasOwnProperty(entity_id) && entityConfirmation[entity_id].status === 'REJECTED') {
          borderColor = '#FF4E4C';
          toolTipMessage = 'Rejected';
        }
        const confirmationStatusTooltip = (
          <Tooltip id={'idx_' + entity_id}>{toolTipMessage}</Tooltip>
        );
        const entityObject = this.getEntity(entity_id);
        if (entityObject && (!entityObject.image_path)) {
          entityObject.image_path = "/images/user.png";
        }

        if (entityObject && entityObject.name) {
          let image_path = "/images/user.png";
          if (entityObject.image_path) {
            image_path = entityObject.image_path;
          }
          return (
            <li key={'task-' + task_id + '-entity-' + i}>
              {this.can_view_team_confirmation && this.props.companyProfile.enable_team_confirmation ?
                <OverlayTrigger placement="top" overlay={confirmationStatusTooltip}>
                  <p style={{ borderColor, borderWidth: '3px' }} className={styles['member-icon']}>
                    <img src={image_path}/>
                  </p>
                </OverlayTrigger>
                :
                <p className={styles['member-icon']}>
                  <img src={image_path}/>
                </p>
              }
              <p className={styles['tooltip']}>
                <span>{entityObject.name}</span>
              </p>
            </li>
          );
        }
        return (
          <li key={'task-' + task_id + '-entity-' + i}>
            {this.props.companyProfile.enable_team_confirmation ?
              <OverlayTrigger placement="top" overlay={confirmationStatusTooltip}>
                <p className={styles['member-icon'] + ' ' + styles['empty']}>?</p>
              </OverlayTrigger>
              :
              <p className={styles['member-icon'] + ' ' + styles['empty']}>?</p>
            }
            <p className={styles['tooltip']}>
              <span>*Unknown</span>
            </p>
          </li>
        );
      });
    } else {
      entityList =
        <li><p className={styles['member-icon'] + ' ' + styles['empty']}>?</p><p className={styles['tooltip']}><span>*Unassigned</span>
        </p></li>;
    }
    return <ul className={styles['entity-list'] + ' list-inline'}>{entityList}</ul>;
  }

  toggleCard(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    let current_state = this.state.showFullCard;
    if (current_state === false) {
      this.setState({showFullCard: true});
    } else {
      this.setState({showFullCard: false});
    }
  }

  render() {
    let task = this.props.task,
      item_status = getStatusDetails(task.status).style;
    let task_color = task.extra_fields && task.extra_fields.task_color ? task.extra_fields.task_color : '#0693e3';

    let status_title = '';
    if (typeof task.status_title !== 'undefined' && task.status_title && task.status_title !== '' && task.status_title !== null) {
      status_title = task.status_title;
    } else {
      status_title = getStatusDetails(task.status).label;
    }
    const taskHoverClass = this.props.showEntities === false ? styles.hoverTask : '';
    const markerHoverClass = (this.props.routeIdMarker && this.props.routeIdMarker === task.id) ? styles.makerHoverTask : '';
    const itemKey = this.props.itemkey + 1;
    return (
      <div  key={'task-comp-' + this.props.itemkey} className={cx(styles['task-item'] + ' ' + styles[item_status], taskHoverClass, markerHoverClass)} onMouseOver={() => this.props.markerHover(itemKey)}  onMouseOut={this.props.markerHoverClose} >
        <div className={styles['task-top']}>
            <p className={styles.status}>{status_title}</p>
          <p className={styles.time}><span><Glyphicon className={styles['icon']}
                                                      glyph="time"/>{moment.utc(task.start_datetime).local().format('h:mm a')}</span>
          </p>
        </div>
        <div className={styles['task-content']} style={{'borderColor': task_color ? task_color : '#000'}}>
          <div className={styles['member-icons']}>
            {this.showEntityFaces(task.entity_ids, task.id, task.entity_confirmation_statuses)}
          </div>

          {task.details && task.details.length > 0 ? (
            <div>{!this.props.singleTaskCard && <div className={styles.TaskNumbers}>{itemKey}</div>}<div><h4>{task.title}{' '}{this.state.showFullCard === true ?
              <FontAwesomeIcon icon={faAngleUp} onClick={this.toggleCard} className={styles.icon}/> :
              <FontAwesomeIcon icon={faAngleDown} onClick={this.toggleCard} className={styles.icon}/>} </h4></div></div>
          ) : (
            <div>{!this.props.singleTaskCard && <div className={styles.TaskNumbers}>{itemKey}</div>}<div><h4>{task.title}</h4></div></div>
          )}
          <div style={{height: this.state.showFullCard === true ? 'auto' : '0'}} className={styles['details-data']}>
            <p>{task.details}</p>
          </div>

          <div className={styles['task-bottom']}>
            <p><Glyphicon className={styles['icon']} glyph="user"/>{task.customer_name}</p>
            <p><Glyphicon className={styles['icon']} glyph="map-marker"/>{task.customer_address}</p>
          </div>
        </div>
      </div>
    );
  }
}


class RouteCard extends Component {
  constructor(props) {
    super(props);
    this.toggleCard = this.toggleCard.bind(this);
    this.showEntityFaces = this.showEntityFaces.bind(this);
    this.assignTeamEquipmentClick = this.assignTeamEquipmentClick.bind(this);
    this.state = {
      showFullCard: false
    };
  }

  getEntity(entityId) {
    return this.props.entities.find((entity) => {
      return entityId === entity.id;
    });
  }

  assignTeamEquipmentClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const task_ids = [];
    let showEntitiesWarning = false;
    let showEquipmentsWarning = false;
    this.props.taskGroup.map((task) => {
      if (!showEntitiesWarning && task.entity_ids.length > 0) {
        showEntitiesWarning = true;
      }
      if (!showEquipmentsWarning && task.resource_ids.length > 0) {
        showEquipmentsWarning = true;
      }
      task_ids.push(task.id);
    });
    this.props.onAssignClick(task_ids, showEntitiesWarning, showEquipmentsWarning);
  }

  toggleCard(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    let current_state = this.state.showFullCard;
    if (current_state === false) {
      this.setState({showFullCard: true});
    } else {
      this.setState({showFullCard: false});
    }
  }

  showEntityFaces(entity_ids, task_id) {
    let entityList = null;
    if (entity_ids && entity_ids.length > 0 && this.props.entities.length > 0) {
      entityList = entity_ids.map((entity_id, i) => {
        const entityObject = this.getEntity(entity_id);
        if (entityObject && (!entityObject.image_path)) {
          entityObject.image_path = "/images/user.png";
        }
        if (entityObject && entityObject.name) {
          let image_path = "/images/user.png";
          if (entityObject.image_path) {
            image_path = entityObject.image_path;
          }
          return (
            <li key={'task-' + task_id + '-entity-' + i}>
              <p className={styles['member-icon']}>
                <img src={image_path}/>
              </p>
              <p className={styles['tooltip']}>
                <span>{entityObject.name}</span>
              </p>
            </li>
          );
        }
        return (
          <li key={'task-' + task_id + '-entity-' + i}>
            <p className={styles['member-icon'] + ' ' + styles['empty']}>?</p>
            <p className={styles['tooltip']}>
              <span>*Unknown</span>
            </p>
          </li>
        );
      });
    } else {
      entityList =
        <li><p className={styles['member-icon'] + ' ' + styles['empty']}>?</p><p className={styles['tooltip']}><span>*Unassigned</span>
        </p></li>;
    }
    return <ul className={styles['entity-list'] + ' list-inline'}>{entityList}</ul>;
  }

  render() {
    let taskGroup = this.props.taskGroup;
    let count = 0;
    let status = null;
    const firstRowStatuses = [];
    const secondRowStatuses = [];
    const statuses = [];
    const totalDisplayStatuses = (taskGroup.length > 7) ? 6 : 7;

    taskGroup.map(task => {
      if (count < totalDisplayStatuses) {
        if (task.status_title === 'NOTSTARTED') {
          status = statuses.find(status => {
            return status.name === 'NOT STARTED';
          });
        } else if (!task.status_title) {
          status = statuses.find(status => {
            return status.name === task.status;
          });
        } else {
          status = statuses.find(status => {
            return status.name === task.status_title;
          });
        }
        if (status) {
          status.count++;
        } else {
          if (task.status_title === 'NOTSTARTED') {
            statuses.push({name: 'NOT STARTED', count: 1, type: task.status});
          } else if (!task.status_title) {
            statuses.push({name: task.status, count: 1, type: task.status});
          } else {
            statuses.push({name: task.status_title, count: 1, type: task.status});
          }
          count++;
        }
      }
    });
    for (let i = 0; i < totalDisplayStatuses && i < statuses.length; i++) {
      if (i < totalDisplayStatuses / 2) {
        firstRowStatuses.push(statuses[i]);
      } else {
        secondRowStatuses.push(statuses[i]);
      }
    }
    const entities = this.props.entities;
    let routeTooltip = 'Route ';
    for (let i = 0; i < taskGroup[0].entity_ids.length; i++) {
      const taskEntity = entities.find((entity) => {
        return entity.id === taskGroup[0].entity_ids[i];
      });
      routeTooltip += taskEntity ? taskEntity.name : '';
      if (i < taskGroup[0].entity_ids.length - 1) {
        routeTooltip += ', ';
      }
    }
    const routeTitle = routeTooltip;

    const routeTitleTooltip = (
      <Tooltip id={'idx_' + taskGroup[0].id}>{routeTooltip}</Tooltip>
    );
    return (
      <div>
        <Row className={styles.routeContainer}>
          <Col xs={1} className={styles.routeIcon}>
            <FontAwesomeIcon icon={this.props.showTasks ? faCaretDown : faCaretRight}/>
          </Col>
          <Col xs={11}>
            <Row>
              <Col xs={6}>
                <OverlayTrigger placement="top" overlay={routeTitleTooltip}>
                  <h4 className={styles.routeHeading}>
                    {routeTitle}
                  </h4>
                </OverlayTrigger>
              </Col>
              <Col xs={6} className={styles.routeTime}>
                {taskGroup[taskGroup.length - 1].end_datetime && <p className={styles.time}>{moment.utc(taskGroup[taskGroup.length - 1].end_datetime).local().format('h:mm a')}</p>}
                {taskGroup[taskGroup.length - 1].end_datetime && <p> - </p>}
                <p className={styles.time}><span><Glyphicon className={styles['icon']}
                                                            glyph="time"/>{moment.utc(taskGroup[0].start_datetime).local().format('h:mm a')}</span>
                </p>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Row className={styles.statusesSummary}>
                  <Col lg={6} md={12} sm={6} xs={6}>
                    <div className={styles.routeStatuses}><span style={{ borderColor: '#008BF8' }}/><p>{taskGroup.length}&nbsp;TASKS</p></div>
                  {firstRowStatuses.map(status => {
                    return (<div className={styles.routeStatuses}><span className={styles[status.type + '']}/><p>{status.count + ' '}{status.name}</p></div>);
                  })}
                  </Col>
                  <Col lg={6} md={12} sm={6} xs={6}>
                    {secondRowStatuses.map(status => {
                      return (<div className={styles.routeStatuses}><span className={styles[status.type + '']}/><p>{status.count + ' '}{status.name}</p></div>);
                    })}
                    {totalDisplayStatuses === 6 && count === 6 && <div className={styles.routeStatuses}><p>+{taskGroup.length - 7}&nbsp;MORE</p></div>}
                  </Col>
                </Row>
                {taskGroup[0].route_id && <Row>
                  <a onClick={this.assignTeamEquipmentClick}><img className={styles.assignTeamEquipment} src="/images/assign-team-equipment.svg"/>Assign Team/Equipment</a>
                </Row>}
              </Col>
              <Col md={6}>
                <div className={styles['member-icons']}>
                  {this.showEntityFaces(taskGroup[0].entity_ids, taskGroup[0].id, taskGroup[0].entity_confirmation_statuses)}
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
        <div className={styles.groupTasks}>
        {this.props.showTasks &&
          taskGroup.map((task, i) => {
            return (
              <div onClick={(e) => this.props.onTaskClick(e, task)}>
                <TaskCard task={task} itemkey={i} routeIdMarker={this.props.routeIdMarker} entities={this.props.entities} markerHover = {this.props.markerHover} markerHoverClose={this.props.markerHoverClose} companyProfile={this.props.companyProfile} profile={this.props.profile} showEntities={false}/>
              </div>
            );
          })
        }
        </div>
      </div>
    );
  }
}

TasksManagerQuick.propTypes = {
  company_id: PropTypes.number.isRequired,
  company_url: PropTypes.string.isRequired,
  createCustomer: PropTypes.func,
  deleteTask: PropTypes.func,
  equipments: PropTypes.arrayOf(PropTypes.object),
  extraFieldsOptions: PropTypes.array,
  getCustomers: PropTypes.func,
  getEstimate: PropTypes.func.isRequired,
  getRatings: PropTypes.func.isRequired,
  getSchedule: PropTypes.func.isRequired,
  getStatus: PropTypes.func.isRequired,
  getTasks: PropTypes.func.isRequired,
  postTask: PropTypes.func,
  searchCustomers: PropTypes.func,
  reporter_id: PropTypes.number.isRequired,
  reporter_name: PropTypes.string.isRequired,
  setNewStatus: PropTypes.func.isRequired,
  statuses: PropTypes.array.isRequired,
  updateTask: PropTypes.func.isRequired,
  taskSendNotification: PropTypes.func,
  location: PropTypes.object,
  companyProfile: PropTypes.object
};

export default TasksManagerQuick;
