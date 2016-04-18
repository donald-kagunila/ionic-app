'use strict';
declare var plugin: any, google: any;

import { SERVER_ADDR } from '../../const';
import { Modal, NavController, Platform, Button, Icon } from 'ionic-angular';
import { MapSnackbar } from '../map-snackbar/controller';
import { Component, OnChanges } from 'angular2/core';
import { Bus } from '../../models/bus';
import { Line } from '../../models/itinerary';

let markerIcons: any = {
    good: 'www/img/bus_green.png',
    average: 'www/img/bus_yellow.png',
    bad: 'www/img/bus_red.png'
};

@Component({
    selector: 'google-maps',
    templateUrl: 'build/components/maps/template.html',
    inputs: ['markers', 'line'],
    directives: [MapSnackbar],
})
export class GoogleMaps implements OnChanges {
    
    private nav: NavController;
    private platform: Platform;
    private map: any;
    private timer: any;
    private markers: Bus[];
    private line: Line;
    private markerList: any = {};
    
    public get Line(): Line {
        return this.line;
    }
    
    constructor(platform: Platform, nav: NavController) {
        this.platform = platform;
        this.nav = nav;
    }
    
    private ngOnInit(): void {
        this.platform.ready().then(() => { this.onPlatformRedy(); });
    }
    
    private onPlatformRedy(): void {
        // Map centered in RJ
        this.map = plugin.google.maps.Map.getMap(document.getElementById("map_canvas"), {
            mapType: plugin.google.maps.MapTypeId.ROADMAP,
            controls: { compass: true, myLocationButton: true, indoorPicker: false, zoom: false },
            camera: { latLng: new plugin.google.maps.LatLng(-22.9083, -43.1964), zoom: 12 }
        });
        this.map.addEventListener(plugin.google.maps.event.MAP_READY, () => { this.onMapReady(); });
    }
    
    private onMapReady(): void {
        console.log("Map ready");
    }
    
    private ngOnDestroy(): void {
        this.removeMarkers();
    }
    
    public ngOnChanges(changes: any): void {
        this.checkMarkerChanges(changes.markers);
    }
    
    private checkMarkerChanges(markers: any): void {
        if(!markers.previousValue && this.isArray(markers.currentValue)) {
            // Just loaded the map view
            if(Object.keys(this.markerList).length>0) this.removeMarkers();
            this.insertNewMarkers(markers.currentValue);
        } else if(this.isArray(markers.previousValue) && this.isArray(markers.currentValue)) {
            // Received new data
            if(JSON.stringify(markers.previousValue)!==JSON.stringify(markers.currentValue))
                this.UpdateMarkers(markers.currentValue);
        }
    }
    
    private isArray(value: any): boolean {
        return value instanceof Array;
    }
    
    private addMarker(key:string, marker: any): void {
        this.markerList[key] = marker;
    }
    
    private fitBounds(points: any[]): void {
        let bounds = new plugin.google.maps.LatLngBounds(points);
        this.map.animateCamera({ 'target' : bounds });
    }
    
    private removeMarkers(): void {
        Object.keys(this.markerList).forEach((key: string) => {
            this.markerList[key].remove();
            delete this.markerList[key];
        });
    }
    
    private insertNewMarkers(buses: Bus[]): void {
        let positions: any = [];
        buses.forEach((bus: Bus, index: number) => {
            let location = new plugin.google.maps.LatLng(bus.Latitude, bus.Longitude);
            this.map.addMarker({
                position: location,
                title: this.formatInfowindowContent(bus),
                icon: {
                    url: this.getIconPath(bus.Timestamp),
                    size: { width: 40, height: 47 }
                }
            }, (marker) => {
                this.addMarker(bus.Order, marker);
                positions.push(location);
                this.fitBounds(positions);
            });
        }, this);
    }
    
    private UpdateMarkers(current: Bus[]): void {
        current.forEach((bus: Bus)=> {
            let marker = this.markerList[bus.Order];
            if(!marker) {
                this.map.addMarker({
                    position: new plugin.google.maps.LatLng(bus.Latitude, bus.Longitude),
                    title: '',
                    snippet: this.formatInfowindowContent(bus),
                    icon: {
                        url: this.getIconPath(bus.Timestamp),
                        size: { width: 40, height: 47 }
                    }
                }, (marker) => {
                    this.addMarker(bus.Order, marker);
                });
            } else marker.setPosition(new plugin.google.maps.LatLng(bus.Latitude, bus.Longitude));
        });
    }
    
    private getIconPath(datetime: Date): string {
        let minutes: number = ((new Date()).getTime() - datetime.getTime())/1000/60;
        if(minutes > 10) return markerIcons.bad;
        else if(minutes >= 5 && minutes < 10) return markerIcons.average;
        else return markerIcons.good;
    }
    
    private prepareTimestamp(datetime: Date): string {
        let timeSinceUpdate: number = (new Date()).getTime() - datetime.getTime();
        timeSinceUpdate = timeSinceUpdate/1000; // seconds
        if(timeSinceUpdate<60) {
            return `${timeSinceUpdate.toFixed(0)} segundos`;
        }
        timeSinceUpdate = timeSinceUpdate/60; // minutes
        if(timeSinceUpdate<60) {
            return `${timeSinceUpdate.toFixed(0)} minutos`;
        }
        timeSinceUpdate = timeSinceUpdate/60; // hours
        if(timeSinceUpdate<24) {
            return `${timeSinceUpdate.toFixed(0)} horas`;
        }
        timeSinceUpdate = timeSinceUpdate/24; // days
        return `${timeSinceUpdate.toFixed(0)} dias`;
    }
    
    private formatInfowindowContent(bus: Bus): string {
        return `
            ${bus.Order} (${bus.Line})
            Velocidade: ${bus.Speed} Km/h
            Direção: ${bus.Direction}
            Atualizado há ${this.prepareTimestamp(bus.Timestamp)}
        `;
    }
}