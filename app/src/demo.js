/**
 * @packet demo;
 * @template template.temp;
 * @require demo.todos.todos;
 * @require demo.hello.base;
 */
Module({
    name:"main",
    extend:"viewgroup",
    layout:"@temp.main",
    option:{
        helloType:"@base.hello",
        todoType:"@todos.todos"
    }
});